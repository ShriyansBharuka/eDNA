import torch
import torch.nn as nn
from transformers import AutoModel

from bilstm import BiLSTM
from attention import SelfAttention


class BarcodeBERTClassifier(nn.Module):
    def __init__(
        self,
        model_name="bioscan-ml/BarcodeBERT",
        num_classes=10,
        lstm_hidden_size=256,
        lstm_layers=2,
        attention_heads=8,
        dropout=0.1,
        freeze_barcodebert=False
    ):
        super().__init__()

        # --------------------------------------------------
        # 1. BarcodeBERT
        # --------------------------------------------------
        self.barcodebert = AutoModel.from_pretrained(
            model_name,
            trust_remote_code=True
        )

        if freeze_barcodebert:
            for param in self.barcodebert.parameters():
                param.requires_grad = False

        # BarcodeBERT hidden dimension
        barcodebert_dim = 768

        # --------------------------------------------------
        # 2. BiLSTM
        # --------------------------------------------------
        self.bilstm = BiLSTM(
            input_size=barcodebert_dim,
            hidden_size=lstm_hidden_size,
            num_layers=lstm_layers,
            dropout=dropout
        )

        # BiLSTM output = 256 × 2 = 512
        lstm_output_dim = self.bilstm.output_size

        # --------------------------------------------------
        # 3. Self-Attention
        # --------------------------------------------------
        self.attention = SelfAttention(
            embed_dim=lstm_output_dim,
            num_heads=attention_heads,
            dropout=dropout
        )

        # --------------------------------------------------
        # 4. Classifier
        # --------------------------------------------------
        self.classifier = nn.Linear(
            lstm_output_dim,
            num_classes
        )

    def forward(
        self,
        input_ids,
        attention_mask=None,
        token_type_ids=None
    ):

        # --------------------------------------------------
        # BarcodeBERT
        # --------------------------------------------------
        barcodebert_output = self.barcodebert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids
        )

        x = barcodebert_output.last_hidden_state
        # [batch, tokens, 768]

        # --------------------------------------------------
        # BiLSTM
        # --------------------------------------------------
        x = self.bilstm(x)
        # [batch, tokens, 512]

        # --------------------------------------------------
        # Self-Attention
        # --------------------------------------------------
        x = self.attention(
    x,
    attention_mask=attention_mask
)
        # [batch, tokens, 512]

        # --------------------------------------------------
        # Mean Pooling
        # --------------------------------------------------
        if attention_mask is not None:

            mask = attention_mask.unsqueeze(-1).float()

            x = x * mask

            x = x.sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9)

        else:

            x = x.mean(dim=1)

        # [batch, 512]

        embedding = x

        # --------------------------------------------------
        # Classification
        # --------------------------------------------------
        logits = self.classifier(embedding)

        return {
            "logits": logits,
            "embedding": embedding
        }