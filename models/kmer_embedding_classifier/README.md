# K-mer Embedding Taxonomic Classifier

## Model Name

`kmer_embedding_classifier`

This is the finalized pure deep-learning taxonomic classification model for the eDNA/ANVESH project. It predicts species from a DNA sequence using an overlapping k-mer embedding model.

## What It Does

Input:

```text
DNA sequence string
```

Output:

```python
{
    "species": "...",
    "confidence": 0.0,
    "embedding": [...]
}
```

The `embedding` is the learned pooled sequence representation produced before the final classifier layers.

## Input Representation

The model uses overlapping 6-mers:

```text
ACGTACGT...
-> ACGTAC, CGTACG, GTACGT, ...
```

Configuration:

- k-mer size: 6
- stride: 1
- vocabulary: `PAD`, `UNK`, and all 4,096 A/C/G/T 6-mers
- ambiguous or unsupported k-mers: mapped to `UNK`
- short sequences shorter than 6 bases: represented as one `UNK` token

No `read_id`, `marker`, `accession`, or other metadata is used as a model feature.

## Model Architecture

```text
DNA sequence
  -> overlapping 6-mer token IDs
  -> trainable embedding, 192 dimensions
  -> masked mean pooling
  -> LayerNorm
  -> Dropout(0.2)
  -> Linear(192, 512)
  -> GELU
  -> Dropout(0.2)
  -> Linear(512, 500 species logits)
```

Trainable parameters: `1,142,516`

This is a pure deep-learning model trained from scratch. It does not use BLAST, Kraken2, MMSeqs2, pretrained DNA encoders, accession metadata, or test-label leakage.

## Training and Evaluation Setup

The final model corresponds to experiment `exp05_mean_k6_overlap`.

- Optimizer: AdamW
- Learning rate: 0.001
- Weight decay: 0.01
- Batch size: 512
- Label smoothing: 0.02
- Class weighting: enabled
- Gradient clipping: 1.0
- Scheduler: cosine annealing
- Max epochs: 40
- Epochs run: 38
- Best epoch: 32
- Selection metric: validation macro-F1
- Device used for final run: CPU

The final evaluation used the existing duplicate-safe train/validation/test split:

- Train: 161,889 samples
- Validation: 20,282 samples
- Test: 20,229 samples
- Classes: 500
- Exact sequence overlap between splits: 0
- Read ID overlap between splits: 0

The test set was evaluated once after selecting the best checkpoint by validation macro-F1.

## Final Reported Metrics

Validation:

- Accuracy: `0.9892515531`
- Macro-F1: `0.9916974362`
- Weighted-F1: `0.9892828166`
- Macro precision: `0.9918700909`
- Macro recall: `0.9918056819`

Untouched test:

- Accuracy: `0.9885313164`
- Macro-F1: `0.9910618423`
- Weighted-F1: `0.9885574587`
- Macro precision: `0.9912115943`
- Macro recall: `0.9910749149`

These metrics are for the provided synthetic dataset split and should not be presented as real-world ecological performance without external validation.

## Important Files

- `src/tokenizer.py`: deterministic overlapping 6-mer vocabulary and sequence encoder
- `src/model.py`: final PyTorch k-mer embedding classifier
- `src/inference.py`: importable prediction API
- `configs/model_config.json`: architecture and training configuration summary
- `results/final_metrics.json`: final validation and untouched-test metrics
- `checkpoints/final_best_model.pt`: trained checkpoint used by inference
- `requirements.txt`: minimal runtime dependency list

## How to Use

From the repository root:

```python
from models.kmer_embedding_classifier.src.inference import DnaSpeciesPredictor

predictor = DnaSpeciesPredictor()
result = predictor.predict("ACGTACGTACGTACGTACGTACGT")

print(result["species"])
print(result["confidence"])
print(len(result["embedding"]))
```

Expected embedding length for this finalized model:

```text
192
```

You may also pass a checkpoint path explicitly:

```python
predictor = DnaSpeciesPredictor(
    "models/kmer_embedding_classifier/checkpoints/final_best_model.pt"
)
```

## Checkpoint Information

The included checkpoint is required for inference and is approximately 4.7 MB. It is small enough for a normal GitHub commit in most repositories and does not require Git LFS unless the team has a stricter repository policy.

The checkpoint contains:

- model weights
- tokenizer configuration and vocabulary
- label mappings
- model/training configuration
- best epoch and validation selection metadata

