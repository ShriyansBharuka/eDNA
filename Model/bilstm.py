import torch
import torch.nn as nn


class BiLSTM(nn.Module):
    def __init__(
        self,
        input_size=768,
        hidden_size=256,
        num_layers=2,
        dropout=0.1
    ):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0
        )

        self.output_size = hidden_size * 2

    def forward(self, x):
        """
        Input:
            x: [batch_size, sequence_length, 768]

        Output:
            output: [batch_size, sequence_length, 512]
        """

        output, _ = self.lstm(x)

        return output