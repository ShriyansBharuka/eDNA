from __future__ import annotations


BASES = "ACGT"


def build_kmer_vocab(k: int) -> dict[str, int]:
    """Build deterministic PAD/UNK plus all A/C/G/T k-mer tokens."""
    vocab = {"PAD": 0, "UNK": 1}
    total = 4**k
    for idx in range(total):
        n = idx
        chars: list[str] = []
        for _ in range(k):
            chars.append(BASES[n % 4])
            n //= 4
        vocab["".join(reversed(chars))] = len(vocab)
    return vocab


def encode_sequence(sequence: str, token_to_id: dict[str, int], k: int = 6, stride: int = 1) -> list[int]:
    """Encode DNA as overlapping k-mer IDs; ambiguous/unknown k-mers map to UNK."""
    seq = (sequence or "").upper().strip()
    unk_id = token_to_id["UNK"]
    if len(seq) < k:
        return [unk_id]
    ids = [token_to_id.get(seq[start : start + k], unk_id) for start in range(0, len(seq) - k + 1, stride)]
    return ids or [unk_id]

