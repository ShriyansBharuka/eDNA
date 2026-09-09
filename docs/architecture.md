# ANVESH — Final Architecture

### Six components, one system, with the Transformer model fully specified

> Every technical term is explained in **[brackets]** the first time it's used.

---

## 0. Final component list

1. **Ensemble/meta-classifier router**
2. **Custom marine-eDNA deep learning classifier** — now specified: a pretrained DNA Transformer + a custom self-attention/BiLSTM head (details below)
3. **Conservation-status-aware dashboard**
4. **Ecological biodiversity indices** (Shannon index, richness, evenness)
5. **Geographic species distribution map** (GBIF-based, click a species → world map of historical sightings)
6. **Genetic similarity map** (NEW — replaces "force a single name" for uncertain detections with a visual map of how close an unknown sequence is to known species)

This document is self-contained — you shouldn't need to flip back to the earlier draft to build from this.

---

## 1. Which Transformer, and why

### Recommendation: **BarcodeBERT** (`bioscan-ml/BarcodeBERT`)

This is a real, published, open-source model — not a hypothetical suggestion. Specifics, all verified directly from the source:

- **What it is:** a small BERT-style Transformer [BERT = a well-known Transformer design that reads a sequence in both directions at once] built *specifically* for DNA barcodes and taxonomic classification — not a general-purpose genomic model repurposed for this. This matters: your task (identify a species from a short marker-gene barcode) is exactly what it was designed for, not an adjacent use case you're bending it toward.
- **Where:** code at `github.com/bioscan-ml/BarcodeBERT`, pretrained weights at `huggingface.co/bioscan-ml/BarcodeBERT`. **License: MIT** [a permissive open-source license — you can use, modify, and build on it, including for a hackathon or beyond, as long as you keep the license notice]. Published in a peer-reviewed journal (*Bioinformatics Advances*), not just a preprint.
- **Size:** small compared to general DNA foundation models (a handful of Transformer layers, not hundreds of millions of parameters) — realistically fine-tunable [adjusting a pretrained model's own weights slightly on your data, rather than training from zero] on hackathon-scale compute and time.
- **Published evidence directly relevant to you:**
  - Barcode-specific pretraining (what BarcodeBERT does) was shown to **outperform fine-tuned general genomic foundation models** (like DNABERT-2) specifically on species/genus-level identification — the exact task you need.
  - BarcodeBERT matched BLAST's [the classic sequence-comparison tool your ensemble router already uses] species-level accuracy while running **55× faster** — a very citable, concrete number for the official PS's "reduce computational time" requirement.
  - Most relevant to your similarity-map idea: in tests specifically measuring how well a model's embeddings [numerical fingerprints of a sequence] support finding the *nearest known relative* of a sequence from a totally new, unseen species, **BarcodeBERT performed best among the deep learning models tested** — this is a direct, published validation of using it for piece 6 below, not just a hopeful assumption.

### The one honest caveat

BarcodeBERT was pretrained on **1.5 million invertebrate (insect) DNA barcodes**, not marine vertebrates. So it isn't "already fish-literate" — but it *is* "already barcode-literate": it has genuinely learned what a DNA barcode looks like, how species differ within one, and how to represent that difference usefully, from a domain that's structurally the same problem (short DNA barcode → species identity) even though the actual organisms are different. This is exactly why fine-tuning it on the marine-vertebrate reference database, rather than only using it frozen, is worth the extra time if you have it — it closes the insect-to-fish domain gap.

### Alternatives worth knowing about (not primary recommendations, but real options)

- **DNABERT-2** — broader multi-species genomic pretraining, not barcode-specific, larger. Fallback if BarcodeBERT proves awkward to adapt.
- **DNABERT-S** — a sibling of DNABERT-2, specifically engineered so its embeddings naturally cluster and separate by species. Worth trying *specifically* for the similarity map (piece 6) if BarcodeBERT's own embeddings don't cluster cleanly enough — though given the finding above, this is a stretch option, not a first choice.
- **Nucleotide Transformer** (InstaDeep/NVIDIA) — comes in sizes from 50M to 2.5B parameters; broad multi-species genomic pretraining, not barcode-specific.
- **BarcodeMamba** — same research group as BarcodeBERT, but uses a different, non-Transformer mechanism (a state-space model, not attention-based). Mentioned for completeness since you asked specifically about the Transformer, so this isn't the one to chase.

---

## 2. Can we take the source code and adapt it to our dataset? — Yes, concretely how

The BarcodeBERT repository is built to be re-pointed at custom data, not hard-coded to only work on its original insect dataset — its own training scripts take a `--data_dir` argument specifically so others can point it at their own barcode data.

**Two concrete paths, in order of what to try first:**

1. **Feature extraction (do this first):** load the pretrained BarcodeBERT weights as-is, run your OceanOmics marine-vertebrate barcode sequences through it, and take its output embeddings [the model's internal numerical representation of each sequence]. Train only your own custom head — self-attention + BiLSTM + a classification layer — on top of these embeddings. You never touch BarcodeBERT's own weights. This is fast, needs comparatively little of your own labeled data, and is very low-risk technically.
2. **Fine-tuning (stretch goal, if time allows):** actually adjust BarcodeBERT's own weights using your marine species barcode data, via the fine-tuning path in its own repo. Needs more data and more compute/time than option 1, but should close the insect-to-marine-vertebrate gap further. Only attempt this once option 1 is working end-to-end.

**Practical example of how loading it looks (confirmed from the model's own usage instructions):**
```python
from transformers import AutoTokenizer, AutoModel

tokenizer = AutoTokenizer.from_pretrained("bioscan-ml/BarcodeBERT", trust_remote_code=True)
model = AutoModel.from_pretrained("bioscan-ml/BarcodeBERT", trust_remote_code=True)

# tokenize a DNA sequence and run it through the model
inputs = tokenizer(dna_sequence, return_tensors="pt")["input_ids"]
hidden_states = model(inputs.unsqueeze(0))["hidden_states"][-1]

# mean-pool across the sequence to get one fixed-length embedding vector
embedding = hidden_states.mean(dim=1)
```
That embedding vector is what feeds into both your custom classification head (piece 2) *and* the similarity map (piece 6) — one model output, two uses.

---

## 3. Component 2 — Classification Engine, full design

```
   Raw DNA barcode sequence
            │
            ▼
   BarcodeBERT (pretrained, frozen initially)
   [outputs one embedding vector per sequence]
            │
            ├──────────────────────────────┐
            ▼                              ▼
   Custom head:                     Similarity Map (piece 6)
   Self-attention → BiLSTM →         [same embedding, used
   classification layer               differently — see below]
   → species prediction
            │
            ▼
   Combined with classical classifiers
   (piece 1, the Ensemble Router) →
   final species call + confidence
```

**Training data needed:** your labeled marine-vertebrate barcode sequences (from the OceanOmics-AmpliconReference database) — this is the custom head's training set. BarcodeBERT itself doesn't need retraining from scratch; only your head does, at least initially.

---

## 4. Component 6 — Genetic Similarity Map (your redesign of the confidence layer)

**What it replaces:** instead of forcing an uncertain detection into a single, possibly-wrong species name, uncertain/unidentified sequences get shown as a node on a map of genetic closeness to known species.

**How it works, step by step:**
1. Every reference species already has a BarcodeBERT embedding computed once (from Section 1–3) — this can be precomputed and stored, not recalculated live each time.
2. An unidentified sequence gets the same embedding computed.
3. Compute the distance [how far apart two embeddings are — smaller distance means more genetically similar] between the unknown sequence and every reference species' embedding.
4. Use a **dimensionality reduction** technique [flattens high-dimensional embeddings down to 2D for display, keeping similar things close together] — t-SNE or UMAP are the standard tools — to lay all of this out as an actual 2D map.
5. Draw the unknown sequence as its own node, connected by edges to its nearest known-species neighbors, with edge length/thickness showing genetic distance.

**Why this is more than just a nice visualization:** the published evidence on BarcodeBERT specifically found it's strong at exactly this — representing sequences from species it never saw in training in a way that still meaningfully reflects their true genetic relationships. You're not asking the tool to do something it wasn't shown to be good at.

**Keep this visually and conceptually separate from piece 5** (the *geographic* map) — one is about genetic closeness, the other is about physical location. Different axis entirely; naming them differently in your actual UI (e.g., "Similarity View" vs. "Distribution Map") avoids confusion during the build.

---

## 5. The other four components (unchanged — brief recap)

These were already fully detailed in the earlier architecture draft; summarized here so this document stands alone:

- **Piece 1 (Ensemble Router):** 3 gene markers (12S, 16S, COI), ~2–3 classical tools total (not per marker) plus the DL classifier above, with the router deciding which to trust most per marker based on the research paper's findings.
- **Piece 3 (Conservation Dashboard):** cross-references final species calls against IUCN Red List and Wildlife Protection Act data, flags anything endangered/protected/commercially significant.
- **Piece 4 (Biodiversity Indices):** Shannon diversity index, species richness, evenness — computed from per-species read counts, shown as index cards on the dashboard.
- **Piece 5 (Geographic Map):** click a species → GBIF occurrence data plotted on a world map with marker clustering, plus your own sample's location highlighted separately.

---

## 6. Updated tech stack

| Layer | Tool | Notes |
|---|---|---|
| Pretrained Transformer | BarcodeBERT (`bioscan-ml/BarcodeBERT`, MIT license) | Feature extraction first, fine-tune later if time allows |
| Custom head | PyTorch (self-attention + BiLSTM + classifier) | Trained on your marine-vertebrate barcode data |
| Similarity map | UMAP or t-SNE (Python libraries) for 2D layout, a graph/network visualization library (e.g. D3.js or a simpler force-directed graph library) for rendering | Reuses BarcodeBERT embeddings already computed for classification |
| Everything else | Unchanged from the earlier architecture draft | Ensemble tools, GBIF integration, dashboard stack, etc. |

---

## 7. What this changes in your MVP checklist

Add to your existing MVP list:
- [ ] BarcodeBERT loaded and successfully producing embeddings for at least a handful of your real reference sequences (this is the "does it even load and run" milestone — do this early, it's foundational).
- [ ] Custom head (self-attention + BiLSTM) trained on top of those embeddings, producing real species predictions on held-out test sequences.
- [ ] Similarity map rendering at least one real example: a held-out species' sequence shown as a node near its true genetic relatives.

**New risk to flag:** BarcodeBERT's dependencies (per its own setup instructions) require Python 3.11 or 3.12 specifically — worth confirming your team's environment matches before the hackathon starts, not during it.

---

## 8. Still open — decide when ready

- Freeze vs. fine-tune BarcodeBERT: start frozen (Section 2, option 1), decide about fine-tuning once you see how much time is left.
- Whether to build a custom lightweight graph-visualization component yourselves for the similarity map, or use an existing charting library's network-graph feature — a frontend-owner decision, not an architecture one.
- Dataset scope and size — as discussed, held off until you're ready to ask for it.
