import torch

from model import BarcodeBERTClassifier


# --------------------------------------------------
# Dummy input
# --------------------------------------------------

batch_size = 2
sequence_length = 10

input_ids = torch.randint(
    low=0,
    high=100,
    size=(batch_size, sequence_length)
)

attention_mask = torch.ones(
    batch_size,
    sequence_length,
    dtype=torch.long
)

token_type_ids = torch.zeros(
    batch_size,
    sequence_length,
    dtype=torch.long
)


# --------------------------------------------------
# Create model
# --------------------------------------------------

model = BarcodeBERTClassifier(
    num_classes=10
)


# --------------------------------------------------
# Forward pass
# --------------------------------------------------

output = model(
    input_ids=input_ids,
    attention_mask=attention_mask,
    token_type_ids=token_type_ids
)


# --------------------------------------------------
# Check outputs
# --------------------------------------------------

print("Logits shape:", output["logits"].shape)
print("Embedding shape:", output["embedding"].shape)