from __future__ import annotations

from pathlib import Path

import torch

from .model import KmerMeanMlpClassifier
from .tokenizer import encode_sequence


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CHECKPOINT = PACKAGE_ROOT / "checkpoints" / "final_best_model.pt"


class DnaSpeciesPredictor:
    """Load the final k-mer embedding checkpoint and predict taxonomic species."""

    def __init__(self, checkpoint_path: str | Path | None = None, device: str = "auto"):
        self.checkpoint_path = Path(checkpoint_path or DEFAULT_CHECKPOINT)
        checkpoint = torch.load(self.checkpoint_path, map_location="cpu", weights_only=False)
        self.experiment_config = checkpoint["experiment_config"]
        self.tokenizer = checkpoint["tokenizer"]
        self.label_to_id = checkpoint["label_to_id"]
        self.id_to_label = {int(key): value for key, value in checkpoint["id_to_label"].items()}

        if self.experiment_config["architecture"] != "kmer_mean_mlp":
            raise ValueError(f"Unsupported checkpoint architecture: {self.experiment_config['architecture']}")

        self.device = torch.device("cuda" if device == "auto" and torch.cuda.is_available() else ("cpu" if device == "auto" else device))
        self.model = KmerMeanMlpClassifier(
            vocab_size=len(self.tokenizer["token_to_id"]),
            num_classes=len(self.label_to_id),
            pad_id=self.tokenizer["pad_id"],
            embedding_dim=self.experiment_config["embedding_dim"],
            dropout=self.experiment_config["dropout"],
        ).to(self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

    @torch.no_grad()
    def predict(self, sequence: str) -> dict:
        token_ids = encode_sequence(
            sequence,
            token_to_id=self.tokenizer["token_to_id"],
            k=self.tokenizer["k"],
            stride=self.tokenizer["stride"],
        )
        input_ids = torch.tensor([token_ids], dtype=torch.long, device=self.device)
        attention_mask = input_ids.ne(self.tokenizer["pad_id"])
        output = self.model(input_ids, attention_mask)
        probabilities = torch.softmax(output["logits"], dim=-1)[0]
        predicted_id = int(torch.argmax(probabilities).item())
        return {
            "species": self.id_to_label[predicted_id],
            "confidence": float(probabilities[predicted_id].item()),
            "embedding": output["embedding"][0].detach().cpu().tolist(),
        }


def predict(sequence: str, checkpoint_path: str | Path | None = None, device: str = "auto") -> dict:
    return DnaSpeciesPredictor(checkpoint_path=checkpoint_path, device=device).predict(sequence)

