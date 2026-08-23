import torch
from transformers import AutoTokenizer

from model import BarcodeBERTClassifier


class BarcodeBERTPredictor:
    def __init__(
        self,
        model,
        tokenizer,
        device="cpu"
    ):
        self.model = model.to(device)
        self.tokenizer = tokenizer
        self.device = device

        self.model.eval()

    def predict(self, sequence):

        # -----------------------------------------
        # Tokenize DNA sequence
        # -----------------------------------------
        inputs = self.tokenizer(
            sequence,
            return_tensors="pt"
        )

        # BarcodeBERT tokenizer returns 1D tensors,
        # so add batch dimension.
        inputs = {
            key: value.unsqueeze(0).to(self.device)
            for key, value in inputs.items()
        }

        # -----------------------------------------
        # Model inference
        # -----------------------------------------
        with torch.no_grad():

            output = self.model(
                input_ids=inputs["input_ids"],
                attention_mask=inputs.get("attention_mask"),
                token_type_ids=inputs.get("token_type_ids")
            )

        # -----------------------------------------
        # Extract outputs
        # -----------------------------------------
        logits = output["logits"]
        embedding = output["embedding"]

        probabilities = torch.softmax(
            logits,
            dim=-1
        )

        confidence, predicted_class = torch.max(
            probabilities,
            dim=-1
        )

        return {
            "predicted_class": predicted_class.item(),
            "confidence": confidence.item(),
            "embedding": embedding.squeeze(0).cpu()
        }