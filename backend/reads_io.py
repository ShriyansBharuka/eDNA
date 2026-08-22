"""
Minimal FASTA/FASTQ reader for uploaded sample files.

Deliberately not a full bioinformatics parser — just enough to pull raw
sequence strings out of whatever the frontend's upload dropzone accepts
(.fastq/.fq/.fasta/.fa, optionally gzipped, or plain .txt treated as FASTA).
"""

import gzip


def parse_reads(filename: str, content: bytes) -> list[str]:
    """
    Returns the list of sequence strings found in the file.
    Raises ValueError if none can be parsed — callers should turn that
    into a 422 rather than silently "succeeding" with zero reads.
    """
    name = filename.lower()
    if name.endswith(".gz"):
        content = gzip.decompress(content)
        name = name[: -len(".gz")]

    text = content.decode("utf-8", errors="ignore")

    if name.endswith((".fastq", ".fq")):
        sequences = _parse_fastq(text)
    else:
        # .fasta/.fa/.txt all go through the FASTA path — a plain .txt of
        # bare sequence lines with no ">" headers still falls out of this
        # correctly (each line becomes its own single-line "record").
        sequences = _parse_fasta(text)

    sequences = [s.strip().upper() for s in sequences if s.strip()]
    if not sequences:
        raise ValueError(f"No sequences could be parsed from '{filename}'")
    return sequences


def _parse_fastq(text: str) -> list[str]:
    lines = text.splitlines()
    # 4-line records: @header / sequence / +[header] / quality
    return [lines[i + 1] for i in range(0, len(lines) - 1, 4) if lines[i].startswith("@")]


def _parse_fasta(text: str) -> list[str]:
    sequences: list[str] = []
    current: list[str] = []
    seen_header = False

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith(">"):
            seen_header = True
            if current:
                sequences.append("".join(current))
                current = []
        else:
            current.append(line)
    if current:
        sequences.append("".join(current))

    # No ">" headers anywhere (e.g. a bare .txt of one sequence per line) —
    # treat every non-empty line as its own sequence instead of one big blob.
    if not seen_header:
        return [line.strip() for line in text.splitlines() if line.strip()]

    return sequences
