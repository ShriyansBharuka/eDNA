from dataset import EDNADataset
from pathlib import Path
from dataset import EDNADataset


# --------------------------------------------------
# Project paths
# --------------------------------------------------

MODEL_DIR = Path(__file__).resolve().parent
REPO_ROOT = MODEL_DIR.parent
DATA_DIR = REPO_ROOT / "simulated_data"

FASTQ_PATH = DATA_DIR / "simulated_reads.fastq"
MANIFEST_PATH = DATA_DIR / "manifest.csv"
SPLITS_PATH = DATA_DIR / "splits.csv"


# -----------------------------
# Training dataset
# -----------------------------

train_dataset = EDNADataset(
    fastq_path=FASTQ_PATH,
    manifest_path=MANIFEST_PATH,
    splits_path=SPLITS_PATH,
    split="train"
)


# -----------------------------
# Validation dataset
# -----------------------------

val_dataset = EDNADataset(
    fastq_path=FASTQ_PATH,
    manifest_path=MANIFEST_PATH,
    splits_path=SPLITS_PATH,
    split="val",
    label_to_id=train_dataset.label_to_id
)


# -----------------------------
# Test dataset
# -----------------------------

test_dataset = EDNADataset(
    fastq_path=FASTQ_PATH,
    manifest_path=MANIFEST_PATH,
    splits_path=SPLITS_PATH,
    split="test",
    label_to_id=train_dataset.label_to_id
)


# -----------------------------
# Results
# -----------------------------

print("\nDataset sizes:")
print("Train:", len(train_dataset))
print("Validation:", len(val_dataset))
print("Test:", len(test_dataset))

print("\nNumber of species:")
print("Train:", len(train_dataset.label_to_id))
print("Validation:", len(val_dataset.label_to_id))
print("Test:", len(test_dataset.label_to_id))


# -----------------------------
# Check sample
# -----------------------------

sample = train_dataset[0]

print("\nFirst training sample:")
print("Read ID:", sample["read_id"])
print("Species:", sample["species"])
print("Marker:", sample["marker"])
print("Label:", sample["label"].item())
print("Sequence length:", len(sample["sequence"]))