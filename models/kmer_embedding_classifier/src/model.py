from __future__ import annotations

import torch
from torch import nn


class KmerMeanMlpClassifier(nn.Module):
    """Final pure-DL overlapping k-mer embedding classifier."""

    def __init__(
        self,
        vocab_size: int,
        num_classes: int,
        pad_id: int = 0,
        embedding_dim: int = 192,
        hidden_dim: int = 512,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.pad_id = pad_id
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=pad_id)
        self.net = nn.Sequential(
            nn.LayerNorm(embedding_dim),
            nn.Dropout(dropout),
            nn.Linear(embedding_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_classes),
        )

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor | None = None) -> dict[str, torch.Tensor]:
        if attention_mask is None:
            attention_mask = input_ids.ne(self.pad_id)
        token_embeddings = self.embedding(input_ids)
        mask = attention_mask.unsqueeze(-1).to(token_embeddings.dtype)
        sequence_embedding = (token_embeddings * mask).sum(dim=1) / mask.sum(dim=1).clamp_min(1.0)
        logits = self.net(sequence_embedding)
        return {"logits": logits, "embedding": sequence_embedding}


def count_parameters(model: nn.Module) -> int:
    return sum(parameter.numel() for parameter in model.parameters() if parameter.requires_grad)

