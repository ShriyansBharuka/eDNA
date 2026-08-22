from pathlib import Path

from transformers import AutoTokenizer
from torch.utils.data import DataLoader

from dataset import EDNADataset
from collator import BarcodeBERTCollator


# --------------------------------------------------
# Paths
# --------------------------------------------------

MODEL_DIR = Path(__file__).resolve().parent
REPO_ROOT = MODEL_DIR.parent
DATA_DIR = REPO_ROOT / "simulated_data"

FASTQ_PATH = DATA_DIR / "simulated_reads.fastq"
MANIFEST_PATH = DATA_DIR / "manifest.csv"
SPLITS_PATH = DATA_DIR / "splits.csv"


# --------------------------------------------------
# BarcodeBERT tokenizer
# --------------------------------------------------

MODEL_NAME = "bioscan-ml/BarcodeBERT"

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True
)


# --------------------------------------------------
# Dataset
# --------------------------------------------------

dataset = EDNADataset(
    fastq_path=FASTQ_PATH,
    manifest_path=MANIFEST_PATH,
    splits_path=SPLITS_PATH,
    split="train"
)


# --------------------------------------------------
# Collator
# --------------------------------------------------

collator = BarcodeBERTCollator(
    tokenizer=tokenizer,
    max_length=256
)


# --------------------------------------------------
# DataLoader
# --------------------------------------------------

loader = DataLoader(
    dataset,
    batch_size=2,
    shuffle=False,
    collate_fn=collator
)


# --------------------------------------------------
# Get one batch
# --------------------------------------------------

batch = next(iter(loader))


print("input_ids:", batch["input_ids"].shape)
print("attention_mask:", batch["attention_mask"].shape)

if batch["token_type_ids"] is not None:
    print("token_type_ids:", batch["token_type_ids"].shape)

print("labels:", batch["labels"].shape)
print("labels:", batch["labels"])