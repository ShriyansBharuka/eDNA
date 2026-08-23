import torch


class BarcodeBERTCollator:

    def __init__(self, tokenizer, max_length=256):
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __call__(self, batch):

        # --------------------------------------------------
        # Extract sequences and labels
        # --------------------------------------------------

        sequences = [
            item["sequence"]
            for item in batch
        ]

        labels = torch.tensor(
            [
                item["label"].item()
                for item in batch
            ],
            dtype=torch.long
        )

        # --------------------------------------------------
        # Tokenize one sequence at a time
        # BarcodeBERT uses a custom tokenizer
        # --------------------------------------------------

        encoded_sequences = []

        for sequence in sequences:

            encoded = self.tokenizer(
                sequence,
                return_tensors="pt"
            )

            encoded_sequences.append(encoded)

        # --------------------------------------------------
        # Pad input IDs
        # --------------------------------------------------

        input_ids = torch.nn.utils.rnn.pad_sequence(
            [
                item["input_ids"].squeeze(0)
                for item in encoded_sequences
            ],
            batch_first=True,
            padding_value=0
        )

        # --------------------------------------------------
        # Pad attention masks
        # --------------------------------------------------

        attention_mask = torch.nn.utils.rnn.pad_sequence(
            [
                item["attention_mask"].squeeze(0)
                for item in encoded_sequences
            ],
            batch_first=True,
            padding_value=0
        )

        # --------------------------------------------------
        # Pad token type IDs if available
        # --------------------------------------------------

        token_type_ids = None

        if "token_type_ids" in encoded_sequences[0]:

            token_type_ids = torch.nn.utils.rnn.pad_sequence(
                [
                    item["token_type_ids"].squeeze(0)
                    for item in encoded_sequences
                ],
                batch_first=True,
                padding_value=0
            )

        # --------------------------------------------------
        # Return batch
        # --------------------------------------------------

        return {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "token_type_ids": token_type_ids,
            "labels": labels
        }