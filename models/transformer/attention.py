import torch
import torch.nn as nn


class SelfAttention(nn.Module):

    def __init__(
        self,
        embed_dim=512,
        num_heads=8,
        dropout=0.1
    ):
        super().__init__()

        self.attention = nn.MultiheadAttention(
            embed_dim=embed_dim,
            num_heads=num_heads,
            dropout=dropout,
            batch_first=True
        )

        self.norm = nn.LayerNorm(embed_dim)

    def forward(
        self,
        x,
        attention_mask=None
    ):

        # HuggingFace:
        # 1 = real token
        # 0 = padding
        #
        # PyTorch MultiheadAttention:
        # True  = ignore
        # False = keep

        key_padding_mask = None

        if attention_mask is not None:
            key_padding_mask = (
                attention_mask == 0
            )

        attended, _ = self.attention(
            x,
            x,
            x,
            key_padding_mask=key_padding_mask
        )

        output = self.norm(
            x + attended
        )

        return output