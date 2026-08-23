import torch
from bilstm import BiLSTM

# Fake BarcodeBERT output
x = torch.randn(2, 10, 768)

model = BiLSTM()

output = model(x)

print("Input shape:", x.shape)
print("Output shape:", output.shape)