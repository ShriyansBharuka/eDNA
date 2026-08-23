"""
Minimal FASTA/FASTQ reader for uploaded sample files.

Deliberately not a full bioinformatics parser — just enough to pull raw
sequence strings out of whatever the frontend's upload dropzone accepts
(.fastq/.fq/.fasta/.fa, optionally gzipped, or plain .txt treated as FASTA).
"""

import gzip
import io
from typing import BinaryIO, Iterable, Iterator

# IUPAC nucleotide codes (including ambiguity codes) — a real DNA read should
# be almost entirely these. Catches the case where a non-sequence file (e.g.
# a taxonomy/accession list) has no ">" headers and would otherwise get
# silently parsed as one bare "sequence" per line — every one of those
# then classifies as low-confidence noise with no error anywhere, which
# looks exactly like a broken app rather than the wrong file being uploaded.
_VALID_BASES = set("ACGTUNRYSWKMBDHV")
_MIN_VALID_FRACTION = 0.9


def _looks_like_dna(seq: str) -> bool:
    if not seq:
        return False
    valid = sum(1 for ch in seq if ch in _VALID_BASES)
    return (valid / len(seq)) >= _MIN_VALID_FRACTION


def parse_reads(filename: str, fileobj: BinaryIO, max_sequences: int | None = None) -> list[str]:
    """
    Returns the list of sequence strings found in the file.
    Raises ValueError if none can be parsed, or if what was parsed doesn't
    actually look like DNA — callers should turn that into a 422 rather
    than silently "succeeding" with reads that will all fail to classify.

    fileobj is a real binary file-like object (FastAPI's UploadFile.file),
    read directly rather than via `await file.read()` into one big `bytes`
    blob first — a plain (non-gzipped) real reference file uploaded during
    testing was 135MB, and reading the whole thing into memory before
    parsing even started was enough on its own to OOM-kill the entire
    Render instance (confirmed from Render's own crash log: "Ran out of
    memory (used over 512MB)... Exited with status 137"), independent of
    how fast/slow the parsing itself was.

    max_sequences stops parsing early once that many records have been
    collected, instead of parsing the whole file and throwing most of it
    away. Both gzip and plain input stream line-by-line the entire way —
    for gzip this also means decompression itself stops early, not just
    the line processing.
    """
    name = filename.lower()
    is_gz = name.endswith(".gz")
    if is_gz:
        name = name[: -len(".gz")]

    lines = _iter_lines(fileobj, is_gz)

    if name.endswith((".fastq", ".fq")):
        sequences = _parse_fastq(lines, max_sequences)
    else:
        # .fasta/.fa/.txt all go through the FASTA path — a plain .txt of
        # bare sequence lines with no ">" headers still falls out of this
        # correctly (each line becomes its own single-line "record").
        sequences = _parse_fasta(lines, max_sequences)

    sequences = [s.strip().upper() for s in sequences if s.strip()]
    if not sequences:
        raise ValueError(f"No sequences could be parsed from '{filename}'")

    dna_sequences = [s for s in sequences if _looks_like_dna(s)]
    if not dna_sequences:
        raise ValueError(
            f"'{filename}' was parsed into {len(sequences)} entries, but none of them look like DNA "
            "sequences (mostly non-ACGT characters). Check this is a real FASTA/FASTQ read file, not "
            "something else, like a taxonomy/accession list."
        )
    return dna_sequences


def _iter_lines(fileobj: BinaryIO, is_gz: bool) -> Iterator[str]:
    """Lazily yields decoded lines straight from the upload stream — nothing
    upstream of this (the multipart body, the decompressor) ever gets fully
    materialized in memory. Callers below break out of these generators once
    capped, which stops the underlying read (and, for gzip, decompression)
    from going any further too."""
    if is_gz:
        with gzip.GzipFile(fileobj=fileobj) as gz:
            text_stream = io.TextIOWrapper(gz, encoding="utf-8", errors="ignore")
            for line in text_stream:
                yield line.rstrip("\n")
    else:
        text_stream = io.TextIOWrapper(fileobj, encoding="utf-8", errors="ignore")
        for line in text_stream:
            yield line.rstrip("\n")


def _parse_fastq(lines: Iterable[str], max_sequences: int | None = None) -> list[str]:
    sequences: list[str] = []
    it = iter(lines)
    # 4-line records: @header / sequence / +[header] / quality
    for header in it:
        seq = next(it, None)
        next(it, None)  # "+" separator line
        next(it, None)  # quality line
        if seq is None:
            break
        if header.startswith("@"):
            sequences.append(seq)
            if max_sequences is not None and len(sequences) >= max_sequences:
                break
    return sequences


def _parse_fasta(lines: Iterable[str], max_sequences: int | None = None) -> list[str]:
    sequences: list[str] = []
    current: list[str] = []
    seen_header = False
    bare_lines: list[str] = []  # only used if the file turns out to have no ">" headers at all

    for line in lines:
        if max_sequences is not None and len(sequences) >= max_sequences:
            current = []
            break
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
            if not seen_header:
                bare_lines.append(line)
                if max_sequences is not None and len(bare_lines) >= max_sequences:
                    break
    if current and seen_header:
        sequences.append("".join(current))

    # No ">" headers anywhere (e.g. a bare .txt of one sequence per line) —
    # treat every non-empty line as its own sequence instead of one big blob.
    return bare_lines if not seen_header else sequences
