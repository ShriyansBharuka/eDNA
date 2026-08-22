from pathlib import Path
import json

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from transformers import AutoTokenizer
from sklearn.metrics import accuracy_score, f1_score

from dataset import EDNADataset
from collator import BarcodeBERTCollator
from model import BarcodeBERTClassifier


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_NAME = "bioscan-ml/BarcodeBERT"

BATCH_SIZE = 16
LEARNING_RATE = 1e-4

# Stability test
EPOCHS = 1
MAX_TRAIN_BATCHES = 100

MAX_LENGTH = 256
NUM_WORKERS = 2

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Device:", DEVICE)


# ============================================================
# PATHS
# ============================================================

MODEL_DIR = Path(__file__).resolve().parent
REPO_ROOT = MODEL_DIR.parent

DATA_DIR = REPO_ROOT / "simulated_data"
CHECKPOINT_DIR = REPO_ROOT / "checkpoints"

CHECKPOINT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

FASTQ_PATH = DATA_DIR / "simulated_reads.fastq"
MANIFEST_PATH = DATA_DIR / "manifest.csv"
SPLITS_PATH = DATA_DIR / "splits.csv"


# ============================================================
# TOKENIZER
# ============================================================

print("\nLoading BarcodeBERT tokenizer...")

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True
)


# ============================================================
# DATASETS
# ============================================================

print("\nLoading datasets...")

train_dataset = EDNADataset(
    fastq_path=FASTQ_PATH,
    manifest_path=MANIFEST_PATH,
    splits_path=SPLITS_PATH,
    split="train"
)

val_dataset = EDNADataset(
    fastq_path=FASTQ_PATH,
    manifest_path=MANIFEST_PATH,
    splits_path=SPLITS_PATH,
    split="val",
    label_to_id=train_dataset.label_to_id
)

num_classes = len(
    train_dataset.label_to_id
)

print("\nNumber of species:", num_classes)


# ============================================================
# COLLATOR
# ============================================================

collator = BarcodeBERTCollator(
    tokenizer=tokenizer,
    max_length=MAX_LENGTH
)


# ============================================================
# DATALOADERS
# ============================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    collate_fn=collator,
    num_workers=NUM_WORKERS,
    pin_memory=torch.cuda.is_available()
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    collate_fn=collator,
    num_workers=NUM_WORKERS,
    pin_memory=torch.cuda.is_available()
)


# ============================================================
# MODEL
# ============================================================

print("\nLoading model...")

model = BarcodeBERTClassifier(
    model_name=MODEL_NAME,
    num_classes=num_classes
)

model = model.to(DEVICE)


# ============================================================
# LOSS + OPTIMIZER
# ============================================================

criterion = nn.CrossEntropyLoss()

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE,
    weight_decay=1e-4
)


# ============================================================
# TRAINING
# ============================================================

print("\nStarting 100-batch stability test...\n")

model.train()

train_loss = 0.0

train_predictions = []
train_labels = []

for batch_idx, batch in enumerate(train_loader):

    # --------------------------------------------------------
    # Stop after 100 batches
    # --------------------------------------------------------

    if batch_idx >= MAX_TRAIN_BATCHES:
        break

    # --------------------------------------------------------
    # Move tensors to GPU
    # --------------------------------------------------------

    input_ids = batch["input_ids"].to(
        DEVICE,
        non_blocking=True
    )

    attention_mask = batch["attention_mask"].to(
        DEVICE,
        non_blocking=True
    )

    labels = batch["labels"].to(
        DEVICE,
        non_blocking=True
    )

    token_type_ids = batch["token_type_ids"]

    if token_type_ids is not None:

        token_type_ids = token_type_ids.to(
            DEVICE,
            non_blocking=True
        )

    # --------------------------------------------------------
    # Forward
    # --------------------------------------------------------

    optimizer.zero_grad(
        set_to_none=True
    )

    output = model(
        input_ids=input_ids,
        attention_mask=attention_mask,
        token_type_ids=token_type_ids
    )

    logits = output["logits"]

    # --------------------------------------------------------
    # Explicit NaN check
    # --------------------------------------------------------

    if torch.isnan(logits).any():

        raise RuntimeError(
            f"NaN detected in logits at batch "
            f"{batch_idx + 1}"
        )

    # --------------------------------------------------------
    # Loss
    # --------------------------------------------------------

    loss = criterion(
        logits,
        labels
    )

    if torch.isnan(loss):

        raise RuntimeError(
            f"NaN detected in loss at batch "
            f"{batch_idx + 1}"
        )

    # --------------------------------------------------------
    # Backpropagation
    # --------------------------------------------------------

    loss.backward()

    # --------------------------------------------------------
    # Gradient NaN check
    # --------------------------------------------------------

    for name, parameter in model.named_parameters():

        if parameter.grad is not None:

            if torch.isnan(
                parameter.grad
            ).any():

                raise RuntimeError(
                    f"NaN gradient detected in "
                    f"{name} at batch "
                    f"{batch_idx + 1}"
                )

    optimizer.step()

    # --------------------------------------------------------
    # Statistics
    # --------------------------------------------------------

    train_loss += loss.item()

    predictions = torch.argmax(
        logits,
        dim=1
    )

    train_predictions.extend(
        predictions.detach()
        .cpu()
        .numpy()
    )

    train_labels.extend(
        labels.detach()
        .cpu()
        .numpy()
    )

    # --------------------------------------------------------
    # Progress
    # --------------------------------------------------------

    if (
        batch_idx + 1
    ) % 10 == 0:

        print(
            f"Batch {batch_idx + 1}/"
            f"{MAX_TRAIN_BATCHES} "
            f"| Loss: {loss.item():.4f}"
        )


# ============================================================
# RESULTS
# ============================================================

num_batches = min(
    MAX_TRAIN_BATCHES,
    len(train_loader)
)

average_loss = (
    train_loss / num_batches
)

accuracy = accuracy_score(
    train_labels,
    train_predictions
)

macro_f1 = f1_score(
    train_labels,
    train_predictions,
    average="macro",
    zero_division=0
)


# ============================================================
# FINAL OUTPUT
# ============================================================

print("\n" + "=" * 60)

print("100-BATCH STABILITY TEST COMPLETE")

print("=" * 60)

print(
    f"Average Loss: {average_loss:.4f}"
)

print(
    f"Accuracy: {accuracy:.4f}"
)

print(
    f"Macro-F1: {macro_f1:.4f}"
)

print(
    "\n✓ No NaN detected."
)

print(
    "✓ Forward pass stable."
)

print(
    "✓ Backward pass stable."
)

print(
    "✓ Optimizer update stable."
)

print("=" * 60)