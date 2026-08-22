import torch

from bilstm import BiLSTM
from attention import SelfAttention


# Fake BarcodeBERT output
x = torch.randn(2, 10, 768)

# BiLSTM
bilstm = BiLSTM()
lstm_output = bilstm(x)

# Self-Attention
attention = SelfAttention()
attention_output = attention(lstm_output)

print("BarcodeBERT shape:", x.shape)
print("BiLSTM shape:", lstm_output.shape)
print("Attention shape:", attention_output.shape)