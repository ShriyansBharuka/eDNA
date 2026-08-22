import pandas as pd
from sklearn.model_selection import train_test_split


MANIFEST_PATH = "simulated_data/manifest.csv"
OUTPUT_PATH = "simulated_data/splits.csv"

RANDOM_SEED = 42


# --------------------------------------------------
# Load manifest
# --------------------------------------------------

df = pd.read_csv(MANIFEST_PATH)

print(f"Total reads: {len(df)}")
print(f"Total species: {df['species'].nunique()}")


# --------------------------------------------------
# First split: 80% train, 20% temporary
# --------------------------------------------------

train_df, temp_df = train_test_split(
    df,
    test_size=0.20,
    stratify=df["species"],
    random_state=RANDOM_SEED
)


# --------------------------------------------------
# Second split: temporary → 10% validation, 10% test
# --------------------------------------------------

val_df, test_df = train_test_split(
    temp_df,
    test_size=0.50,
    stratify=temp_df["species"],
    random_state=RANDOM_SEED
)


# --------------------------------------------------
# Assign split labels
# --------------------------------------------------

train_df = train_df.copy()
val_df = val_df.copy()
test_df = test_df.copy()

train_df["split"] = "train"
val_df["split"] = "val"
test_df["split"] = "test"


# --------------------------------------------------
# Combine
# --------------------------------------------------

splits = pd.concat(
    [train_df, val_df, test_df],
    ignore_index=True
)

# Keep original manifest ordering
splits = splits.sort_values("read_id").reset_index(drop=True)


# --------------------------------------------------
# Save
# --------------------------------------------------

splits.to_csv(OUTPUT_PATH, index=False)


# --------------------------------------------------
# Verify
# --------------------------------------------------

print("\nSplit sizes:")
print(splits["split"].value_counts())

print("\nSpecies per split:")
print(
    splits.groupby("split")["species"]
    .nunique()
)

print(f"\nSaved to: {OUTPUT_PATH}")