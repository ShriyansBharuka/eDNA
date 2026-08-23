import torch
from transformers import AutoTokenizer

from model import BarcodeBERTClassifier
from inference import BarcodeBERTPredictor


MODEL_NAME = "bioscan-ml/BarcodeBERT"

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True
)

model = BarcodeBERTClassifier(
    model_name=MODEL_NAME,
    num_classes=10
)

predictor = BarcodeBERTPredictor(
    model=model,
    tokenizer=tokenizer
)

sequence = "ATCGATCGATCGATCGATCG"

result = predictor.predict(sequence)

print("Predicted class:", result["predicted_class"])
print("Confidence:", result["confidence"])
print("Embedding shape:", result["embedding"].shape)