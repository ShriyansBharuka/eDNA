import pandas as pd
import torch
from torch.utils.data import Dataset
from Bio import SeqIO


class EDNADataset(Dataset):

    def __init__(
        self,
        fastq_path,
        manifest_path,
        splits_path,
        split,
        label_to_id=None
    ):
        """
        Load one split of the simulated eDNA dataset.

        Parameters
        ----------
        fastq_path : str
            Path to simulated_reads.fastq

        manifest_path : str
            Path to manifest.csv

        splits_path : str
            Path to splits.csv

        split : str
            "train", "val", or "test"

        label_to_id : dict, optional
            Species -> integer mapping.
            Validation and test must use the training mapping.
        """

        # ==================================================
        # 1. Validate split
        # ==================================================

        if split not in {"train", "val", "test"}:
            raise ValueError(
                "split must be 'train', 'val', or 'test'"
            )

        # ==================================================
        # 2. Load manifest
        # ==================================================

        manifest = pd.read_csv(manifest_path)

        required_columns = {
            "read_id",
            "species",
            "marker",
            "accession"
        }

        missing = required_columns - set(manifest.columns)

        if missing:
            raise ValueError(
                f"Missing columns in manifest: {missing}"
            )

        # ==================================================
        # 3. Load fixed split file
        # ==================================================

        splits = pd.read_csv(splits_path)

        if "read_id" not in splits.columns:
            raise ValueError(
                "splits.csv must contain 'read_id'"
            )

        if "split" not in splits.columns:
            raise ValueError(
                "splits.csv must contain 'split'"
            )

        # Keep only requested split
        splits = splits[splits["split"] == split]

        # ==================================================
        # 4. Merge manifest + split
        # ==================================================

        manifest = manifest.merge(
            splits[["read_id", "split"]],
            on="read_id",
            how="inner"
        )

        # ==================================================
        # 5. Load FASTQ
        # ==================================================

        sequences = {}

        for record in SeqIO.parse(
            fastq_path,
            "fastq"
        ):
            sequences[record.id] = str(
                record.seq
            ).upper()

        # ==================================================
        # 6. Match FASTQ reads with manifest
        # ==================================================

        samples = []

        for _, row in manifest.iterrows():

            read_id = row["read_id"]

            if read_id not in sequences:
                continue

            samples.append(
                {
                    "read_id": read_id,
                    "sequence": sequences[read_id],
                    "species": row["species"],
                    "marker": row["marker"],
                    "accession": row["accession"]
                }
            )

        self.data = pd.DataFrame(samples)

        if len(self.data) == 0:
            raise ValueError(
                f"No FASTQ reads found for {split} split."
            )

        # ==================================================
        # 7. Create / use species label mapping
        # ==================================================

        if label_to_id is None:

            # Used ONLY for training
            species = sorted(
                self.data["species"].unique()
            )

            self.label_to_id = {
                name: idx
                for idx, name in enumerate(species)
            }

        else:

            # Used for validation/test
            self.label_to_id = label_to_id

        # Reverse mapping
        self.id_to_label = {
            idx: name
            for name, idx in self.label_to_id.items()
        }

        # ==================================================
        # 8. Convert species → integer labels
        # ==================================================

        self.data["label"] = (
            self.data["species"]
            .map(self.label_to_id)
        )

        # Check for unknown species
        if self.data["label"].isna().any():

            unknown = (
                self.data.loc[
                    self.data["label"].isna(),
                    "species"
                ]
                .unique()
                .tolist()
            )

            raise ValueError(
                f"Unknown species found in {split} "
                f"dataset: {unknown[:10]}"
            )

        self.data["label"] = (
            self.data["label"]
            .astype(int)
        )

        # ==================================================
        # 9. Store split information
        # ==================================================

        self.split = split

        print(
            f"{split.upper()} dataset loaded: "
            f"{len(self.data)} samples"
        )

    # ======================================================
    # Dataset length
    # ======================================================

    def __len__(self):
        return len(self.data)

    # ======================================================
    # Get one sample
    # ======================================================

    def __getitem__(self, index):

        row = self.data.iloc[index]

        return {
            "sequence": row["sequence"],

            "label": torch.tensor(
                row["label"],
                dtype=torch.long
            ),

            "species": row["species"],

            "marker": row["marker"],

            "read_id": row["read_id"],

            "accession": row["accession"]
        }