# ANVESH — Actual Pipeline, End to End

Written to answer one specific question the team got confused about: **is the Transformer used, or the DL model, or both?** Short answer up front, then the full trace through the real code so there's no ambiguity left. Checked directly against the code on disk as of 2026-08-23 — every file/line reference below was actually read, not recalled from memory.

---

## TL;DR

There are **four** separate model/tool artifacts in this repo. Only **two** are wired into the live app, and they do **different jobs** — neither one is "the" classifier alone:

| Artifact | Is it a Transformer? | Is it "DL"? | Live in the app? | What it does |
|---|---|---|---|---|
| **A. 5-mer TF-IDF + Logistic Regression** | No | No — classical ML, not a neural network at all | **YES — this is what classifies every uploaded read** | Assigns a species name + confidence to each read |
| **B. `kmer_mean_mlp`** (custom PyTorch model) | No — a small feedforward net (embedding layer + 1 hidden layer), no attention mechanism | Yes, technically (it's a neural net), but shallow — not a foundation model | **YES — but only for the similarity map, never for classification** | Embeds a read into 192-D space, compared against reference species to power the Genetic Similarity Map |
| **C. BarcodeBERT + BiLSTM + Self-Attention** | **Yes — this is the actual Transformer** (`bioscan-ml/BarcodeBERT`, a real pretrained model from HuggingFace) | Yes | **NO — real code, never actually trained** | Was the originally-specified classifier; only ever run as a 1-epoch/100-batch "stability test," no saved checkpoint exists |
| **D. VSEARCH + Kraken2 ensemble router** | No | No — classical bioinformatics tools + a hand-written scoring formula | **NO — built and tested standalone, not connected to the live API** | Was meant to cross-check two classical alignment tools per marker gene |

**So: the Transformer is not used. The DL model is used, but only for the similarity map, not for species identification. The thing actually calling species names today is classical machine learning (TF-IDF + Logistic Regression), not deep learning at all.** That's very likely the source of the confusion — two things in this repo hit 98%+ accuracy and both are "real trained models," but only one of them (the classical one) is the one making the actual species call you see in the dashboard.

---

## Directory map (so "which file is which model" stops being confusing)

A teammate reorganized this today (2026-08-23), which is worth flagging since it briefly broke the live backend (fixed as part of writing this doc — see the callout in §3 below):

```
models/
├── transformer/                    ← misleading folder name, read carefully
│   ├── model.py                    ← Artifact C: BarcodeBERTClassifier (real Transformer arch)
│   ├── attention.py, bilstm.py     ← the custom head on top of BarcodeBERT
│   ├── train.py                    ← the Transformer's training script — only ever run as a stability test
│   ├── kmer_baseline.py            ← the training script that produced Artifact A (confusingly, NOT the Transformer)
│   ├── checkpoints/
│   │   ├── tfidf_5mer_vectorizer.pkl      ← Artifact A's actual saved, loadable checkpoint
│   │   ├── kmer_logistic_regression.pkl   ← Artifact A's actual saved, loadable checkpoint
│   │   └── label_mapping.json
│   └── results/final_results.json  ← Artifact A's real evaluation numbers (98.66% test accuracy)
│
└── kmer_embedding_classifier/      ← Artifact B lives here (unambiguous folder name)
    ├── src/model.py                ← KmerMeanMlpClassifier (small feedforward net, not a Transformer)
    ├── checkpoints/final_best_model.pt   ← Artifact B's actual saved, loadable checkpoint
    ├── results/final_metrics.json  ← Artifact B's real evaluation numbers (98.85% test accuracy)
    └── similarity_map/             ← precomputed reference graph the similarity map serves
```

The `transformer/` folder holding both the real (untrained) Transformer code *and* the classical baseline's actual checkpoint is the single most confusing thing in this repo's layout — worth a mental note, or a rename, before anyone else on the team goes looking for "the transformer's checkpoint" in there and can't find one (there isn't one).

---

## The full live pipeline, step by step

```
                    ┌──────────────────────────┐
                    │  User uploads a sample     │
                    │  (FASTA/FASTQ/.gz)         │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    backend/reads_io.py
                    parse_reads() → list[str] raw sequences
                                  │
                                  ▼
                    POST /samples/upload
                    stored in-memory as SAMPLES[id], status="uploaded"
                                  │
                                  ▼
                    POST /samples/{id}/classify
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  backend/classifier.py — classify_reads()      │
        │                                                 │
        │  ARTIFACT A: 5-mer TF-IDF + Logistic Regression │
        │  (classical ML — no neural network involved)    │
        │                                                 │
        │  For EVERY read:                                │
        │   1. Classify the read as given                │
        │   2. Classify its reverse-complement too         │
        │      (see full-pipeline-walkthrough.md)         │
        │   3. Keep whichever orientation scored higher    │
        │                                                 │
        │  Output: {species, confidence} per read          │
        └─────────────────────┬───────────────────────────┘
                              │
              ┌───────────────┼────────────────────┐
              ▼               ▼                     ▼
   conservation_flag.py   biodiversity_indices.py   (species/read_count/
   IUCN + Wildlife         Shannon / richness /       confidence stored
   Protection Act lookup   evenness — from real       per sample as
   (no ML — a cached       per-species read counts    "detections")
   lookup table)           of THIS sample
              │               │                     │
              └───────────────┴─────────────────────┘
                              │
                              ▼
                GET /samples/{id}/results, /indices
                → species list, biodiversity cards render on the dashboard
                              │
                              │   (user then clicks a species in the list)
                              ▼
        ┌─────────────────────────────────────────────┐
        │  backend/embedding.py — live_similarity()       │
        │                                                 │
        │  ARTIFACT B: kmer_mean_mlp (PyTorch, small        │
        │  feedforward net — NOT a Transformer)            │
        │                                                 │
        │  Takes THIS sample's own reads that Artifact A   │
        │  called as that species, embeds them for real     │
        │  (a genuine forward pass), mean-pools into one     │
        │  query vector, compares by cosine similarity        │
        │  against all 500 species' precomputed reference     │
        │  centroids (models/kmer_embedding_classifier/        │
        │  similarity_map/embeddings/                          │
        │  species_centroid_embeddings.npy)                     │
        │                                                       │
        │  Output: self_similarity (sanity check on Artifact    │
        │  A's own call) + top-8 nearest OTHER species           │
        └─────────────────────┬─────────────────────────────────┘
                              │
                              ▼
                GET /samples/{id}/species/{name}/similarity
                → Genetic Similarity Map (D3 force graph) renders
```

**Every arrow above is real and traced against the actual code.** Nothing in this diagram is BarcodeBERT, and nothing in this diagram involves VSEARCH or Kraken2 — neither Artifact C nor Artifact D appears anywhere in the live request path.

---

## Artifact-by-artifact detail

### A. 5-mer TF-IDF + Logistic Regression — the actual classifier

- **Code**: `backend/classifier.py`, checkpoint at `models/transformer/checkpoints/{tfidf_5mer_vectorizer.pkl, kmer_logistic_regression.pkl}`.
- **How it works**: every DNA sequence gets broken into overlapping 5-character substrings (5-mers), turned into a TF-IDF feature vector (a classical NLP technique — same math used for text document classification, applied here to DNA k-mers instead of words), then a Logistic Regression model (a linear classifier — not a neural network, no hidden layers, no backpropagation-learned representations) predicts one of 500 species from that vector.
- **Trained on**: `simulated_data/manifest.csv` — 161,920 training reads, 20,240 held out for testing.
- **Real accuracy**: 98.66% on the held-out test set (`models/transformer/results/final_results.json`).
- **Why this one and not the Transformer**: it's simple, fast (no GPU, sub-millisecond per read), and it's the one that actually got a checkpoint saved. That's it — there's no deeper reason. It happens to be very accurate on data shaped like its training set (see the caveat below).
- **Known real limitation, found via testing today**: it's a closed-set classifier over exactly 500 species — anything outside that list gets a forced, low-confidence wrong guess. Was also missing reverse-complement robustness until it was fixed (see [`full-pipeline-walkthrough.md`](full-pipeline-walkthrough.md)) — that part's now fixed.

### B. `kmer_mean_mlp` — the similarity-map model, not a classifier in production

- **Code**: `models/kmer_embedding_classifier/src/model.py` (`KmerMeanMlpClassifier`), checkpoint at `models/kmer_embedding_classifier/checkpoints/final_best_model.pt`. Live wiring in `backend/embedding.py`.
- **Architecture**: an embedding lookup table (192 dimensions per k-mer) → masked mean-pooling across the sequence → LayerNorm → Linear(192→512) → GELU → Linear(512→500). This is a real, small neural network — but it's a feedforward MLP over pooled embeddings, **not a Transformer**: no self-attention, no positional encoding, no multi-head anything.
- **It has its own classification head** (that final `Linear(512→500)` layer) and was independently trained/evaluated to **98.85% test accuracy** (`models/kmer_embedding_classifier/results/final_metrics.json`) — this is the second "98%+ model" that's likely adding to the confusion. But the live app **never calls this model's own species prediction**. `backend/embedding.py` only ever calls its embedding output (the 192-D vector *before* the final classification layer), never `argmax(logits)`.
- **What it's actually used for live**: taking the real reads Artifact A already classified as some species, embedding them, and checking how close that embedding lands to the reference centroid of that species (plus every other species) — a live, genuine sanity check and nearest-neighbor search, not a second classification opinion.

### C. BarcodeBERT + BiLSTM + Self-Attention — the originally-specified model, not usable yet

- **Code**: `models/transformer/model.py` (`BarcodeBERTClassifier`), `attention.py`, `bilstm.py`, training script `train.py`.
- **This IS a real Transformer**: it loads the actual pretrained `bioscan-ml/BarcodeBERT` weights from HuggingFace (`AutoModel.from_pretrained("bioscan-ml/BarcodeBERT", trust_remote_code=True)`), a genuine barcode-specific BERT-style model — not a placeholder, not a stub. Its output feeds a BiLSTM, then a self-attention layer, then mean-pooling, then a classification head — exactly the architecture specified in `docs/architecture.md`.
- **Why it's not live**: `train.py` sets `EPOCHS = 1` and `MAX_TRAIN_BATCHES = 100`, explicitly commented `# Stability test` — this was a "does it run without crashing" check, not a real training run. There is **no saved checkpoint file** anywhere under `models/transformer/` (no `.pt`, `.bin`, or `.safetensors` for this specific architecture — only Artifact A's `.pkl` files exist in that folder). It cannot currently be loaded for inference because it was never actually trained to convergence and saved.
- **Bottom line**: real, correct, ready-to-train code. Zero live impact today.

### D. VSEARCH + Kraken2 ensemble router — built, tested, disconnected

- **Code**: `backend/router.py` (consensus voting between two classical alignment/classification tools per marker gene), `backend/confidence.py` (a hand-written weighted-average confidence formula combining tool agreement + sequence identity).
- **Not ML/DL at all** — this is classical bioinformatics tooling (VSEARCH does sequence alignment against a reference database; Kraken2 does k-mer-based taxonomic classification) plus a rule-based scoring formula on top.
- **Status**: has its own `if __name__ == "__main__"` test cases that pass, but nothing in `backend/main.py` calls `router.py` or `confidence.py` — there's no live VSEARCH/Kraken2 execution for an arbitrary upload today.

---

## Why the confusion happened (plain version, for explaining to the rest of the team)

1. Two different people/threads trained two different models, both hit ~98-99% accuracy, and both are genuinely real, checkpointed, working models. That alone makes it sound like there must be "two competing classifiers."
2. One of those two (Artifact B) *also happens to have its own classification head* even though the app only uses its embeddings — so it's easy to assume it's doing double duty as a classifier when it isn't.
3. The *third* model (Artifact C, the actual Transformer) is the one that matches the original architecture doc everyone read at the start of the project — so it's natural to assume "the Transformer" must be running somewhere, when actually it's the one piece that was never finished.
4. The folder name `models/transformer/` holds the *classical* baseline's real checkpoint, not the Transformer's — a very reasonable thing to misread at a glance.

## One-sentence summary to give anyone who asks

**"Species identification is done by a classical machine learning model (TF-IDF + Logistic Regression, 98.66% accuracy) — a second, independently trained small neural network (98.85% accuracy) doesn't classify anything, it powers the live Genetic Similarity Map by embedding real reads and comparing them to reference species — and the originally-planned Transformer (BarcodeBERT) has real, correct code but was never actually trained, so it isn't running anywhere in the live app yet."**
