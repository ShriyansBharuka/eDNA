from pathlib import Path

code = r'''
import pandas as pd
import numpy as np

from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score


# ============================================================
# PATHS
# ============================================================

DATA_DIR = Path("/content/simulated_data")

MANIFEST = DATA_DIR / "manifest.csv"


# ============================================================
# LOAD MANIFEST
# ============================================================

print("Loading manifest...")

df = pd.read_csv(MANIFEST)

print("Total reads:", len(df))
print("Species:", df["species"].nunique())

print("\nColumns:")
print(df.columns.tolist())


# ============================================================
# FIND SEQUENCE COLUMN
# ============================================================

sequence_candidates = [
    "sequence",
    "seq",
    "Sequence",
    "dna_sequence"
]

sequence_col = None

for col in sequence_candidates:
    if col in df.columns:
        sequence_col = col
        break

if sequence_col is None:
    raise ValueError(
        "Could not find sequence column in manifest."
    )

print("\nSequence column:", sequence_col)


# ============================================================
# FIND SPLIT COLUMN
# ============================================================

if "split" not in df.columns:
    raise ValueError(
        "Manifest does not contain a split column."
    )


# ============================================================
# REMOVE INVALID ROWS
# ============================================================

df = df.dropna(
    subset=[
        sequence_col,
        "species",
        "split"
    ]
).copy()

df[sequence_col] = (
    df[sequence_col]
    .astype(str)
    .str.upper()
)


# ============================================================
# DATA
# ============================================================

train = df[df["split"] == "train"]
val = df[df["split"] == "val"]
test = df[df["split"] == "test"]

print("\nSplit sizes:")
print("Train:", len(train))
print("Val:", len(val))
print("Test:", len(test))


# ============================================================
# TEST DIFFERENT K VALUES
# ============================================================

for k in [3, 5, 7]:

    print("\n" + "=" * 60)
    print(f"K-MER BASELINE: k={k}")
    print("=" * 60)

    vectorizer = CountVectorizer(
        analyzer="char",
        ngram_range=(k, k),
        lowercase=False,
        min_df=2
    )

    X_train = vectorizer.fit_transform(
        train[sequence_col]
    )

    X_val = vectorizer.transform(
        val[sequence_col]
    )

    X_test = vectorizer.transform(
        test[sequence_col]
    )

    print(
        "Features:",
        X_train.shape[1]
    )

    # --------------------------------------------------------
    # Classifier
    # --------------------------------------------------------

    classifier = LogisticRegression(
        max_iter=100,
        n_jobs=-1,
        C=10
    )

    classifier.fit(
        X_train,
        train["species"]
    )

    # --------------------------------------------------------
    # Validation
    # --------------------------------------------------------

    val_pred = classifier.predict(
        X_val
    )

    val_acc = accuracy_score(
        val["species"],
        val_pred
    )

    val_f1 = f1_score(
        val["species"],
        val_pred,
        average="macro",
        zero_division=0
    )

    # --------------------------------------------------------
    # Test
    # --------------------------------------------------------

    test_pred = classifier.predict(
        X_test
    )

    test_acc = accuracy_score(
        test["species"],
        test_pred
    )

    test_f1 = f1_score(
        test["species"],
        test_pred,
        average="macro",
        zero_division=0
    )

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    print("\nValidation:")
    print(
        f"Accuracy: {val_acc * 100:.2f}%"
    )

    print(
        f"Macro-F1: {val_f1:.4f}"
    )

    print("\nTest:")
    print(
        f"Accuracy: {test_acc * 100:.2f}%"
    )

    print(
        f"Macro-F1: {test_f1:.4f}"
    )
'''

Path("/content/kmer_baseline.py").write_text(code)

print("Created /content/kmer_baseline.py")