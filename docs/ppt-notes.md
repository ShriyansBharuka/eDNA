# AquaVigil — SIH PPT Source Notes

Raw material for the pitch deck. Pull slides from this directly — headings below map roughly 1:1 to slides. Everything here is checked against the actual code/data in this repo as of 2026-08-23, not aspirational copy — where something is still a work-in-progress rather than shipped, it's marked **[ROADMAP]** so it doesn't accidentally get pitched as done. Judges in Q&A will poke exactly here, so keep that distinction in the deck too (a "what's real today" slide is a strength, not a weakness — see §10).

One naming note before anything else: the repo/project is **AquaVigil** everywhere except the live frontend's on-page branding, which currently reads **"Gravity Falls."** Pick one name for the deck and demo and stay consistent — judges will notice a mismatch between the slide title and the live URL.

---

## 1. Actual Problem Statement

**PS SIH25042 — Ministry of Earth Sciences.** Topic: eDNA (environmental DNA)-based identification of marine species.

Paste the **exact official wording from the SIH portal** into this section before building the slide — this file doesn't have it verbatim and you don't want to paraphrase a government PS from memory on a competition slide. What's grounded here is the *problem shape* the whole system was built around, which lines up with how eDNA metabarcoding challenges are typically framed:

- Marine environmental samples (water, sediment) contain trace DNA shed by species that were never physically seen or caught.
- Reference databases for marine species — especially deep-sea and Indian-ocean-specific taxa — are sparse and incomplete, so naive "look it up in a database" approaches fail on exactly the specimens that matter most (rare, endangered, or previously unrecorded species).
- Manual, expert-driven taxonomic identification doesn't scale to the sequencing volume modern eDNA sampling produces.
- The system needs to go beyond "identify the species" — it needs to flag conservation-relevant findings (endangered/protected species) and quantify biodiversity (not just presence/absence), because that's what the finding is actually *for* — policy and monitoring, not just a species list.

---

## 2. One-Line Pitch

**AquaVigil takes a raw eDNA sample, classifies every read against 500 marine species, flags anything endangered or legally protected under Indian law, computes real biodiversity indices, and — for reads that don't confidently match anything — shows *where in genetic space* they actually sit instead of forcing a guess.**

---

## 3. Architecture

### 3.1 System diagram (text form — redraw this as a proper diagram in the deck)

```
                         ┌─────────────────────────┐
                         │   Uploaded eDNA sample    │
                         │  (FASTA / FASTQ / .gz)   │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      reads_io.py          │
                         │  parse → raw sequences    │
                         └────────────┬─────────────┘
                                      │
                    ┌─────────────────┴──────────────────┐
                    ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────────┐
      │  classifier.py             │         │  embedding.py                  │
      │  5-mer TF-IDF + Logistic   │         │  kmer_mean_mlp (PyTorch)       │
      │  Regression — 500 species  │         │  192-D embedding per read      │
      │  98.66% test accuracy      │         │  98.85% test accuracy          │
      │  → LIVE classification     │         │  → LIVE per-read similarity    │
      └────────────┬───────────────┘         └────────────┬────────────────┘
                    │                                       │
                    ▼                                       ▼
      ┌───────────────────────────┐         ┌───────────────────────────────┐
      │ conservation_flag.py       │         │ 500-species centroid          │
      │ IUCN + India Wildlife      │         │ embedding space (cosine sim)  │
      │ Protection Act lookup      │         │ → nearest-relative graph       │
      └────────────┬───────────────┘         └────────────┬────────────────┘
                    │                                       │
                    ▼                                       ▼
      ┌───────────────────────────┐         ┌───────────────────────────────┐
      │ biodiversity_indices.py    │         │ Genetic Similarity Map (D3)    │
      │ Shannon / richness /       │         │ live embedding vs. reference   │
      │ evenness, from real counts │         │ centroids, self-match score    │
      └────────────┬───────────────┘         └────────────┬────────────────┘
                    │                                       │
                    └───────────────────┬───────────────────┘
                                         ▼
                         ┌─────────────────────────┐
                         │      FastAPI backend       │
                         │  REST endpoints, JWT auth  │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   React + TS dashboard     │
                         │ species list, biodiversity │
                         │ cards, maps, similarity     │
                         └─────────────────────────┘
```

### 3.2 Component table (matches the original 6-component PS design)

| # | Component | Status | What it actually does |
|---|---|---|---|
| 1 | Ensemble/meta-classifier router (VSEARCH + Kraken2 agreement) | Built, tested, **not wired into the live API** [ROADMAP] | Two classical tools cross-check each other; confidence layer built |
| 2 | Marine-eDNA classifier | **Live** | 5-mer TF-IDF + Logistic Regression, 500 species, 98.66% test accuracy |
| 2b | Deep-learning classifier (BarcodeBERT + BiLSTM + attention, as originally specified) | Architecture written, **no trained checkpoint** [ROADMAP] | See §9 |
| 2c | Second independent classifier (`kmer_mean_mlp`, PyTorch) | **Live** — powers similarity, not primary classification | 98.85% test accuracy, produces real 192-D embeddings |
| 3 | Conservation-status-aware dashboard | **Live** | Flags IUCN Red List category + India Wildlife Protection Act schedule |
| 4 | Biodiversity indices | **Live** | Shannon index, richness, evenness — computed from real per-sample counts |
| 5 | Geographic distribution map | **Partially live** | Live GBIF occurrence lookup with a fallback stub; sample location is real per-upload |
| 6 | Genetic similarity map | **Live**, and upgraded beyond the original spec | See §4.1 — this is the one novel piece worth a whole slide |

### 3.3 Two independently trained models, on purpose

This is worth explaining on its own slide because it looks redundant until you see why it isn't:

- **Model A** (5-mer TF-IDF + Logistic Regression) does the actual species call for every uploaded read — fast, simple, 98.66% test accuracy across 500 species.
- **Model B** (`kmer_mean_mlp`, a small PyTorch neural network, 98.85% test accuracy) never makes the species call. Instead it embeds the *same real reads* into a 192-dimensional space and checks how close they land to the reference centroid of the species Model A assigned them to.

Two independently trained models agreeing on a call is a stronger signal than one model's confidence score alone — and it's what makes the similarity map's "self-similarity" number in §4.1 meaningful rather than decorative.

---

## 4. Novel Features

### 4.1 Live per-read genetic similarity, not just a label (the headline feature)

Most classifiers stop at "this read is *Species X*, confidence 94%." AquaVigil does one more real step: it takes the **actual reads** from your sample that got called as *Species X*, runs them through a second, independently trained model, and checks — for real, at query time, not from a lookup table — how close those specific reads land to *Species X*'s reference genetic signature versus every other species in the 500-species reference space.

Concretely, tested live in this repo: 15 real reads from a sample, classified as *Kyphosus azureus*, embedded and compared against all 500 reference centroids — landed at **99.84% similarity** to their own species' centroid, with genuinely different (and genuinely computed) nearest-neighbor species surfaced for the map. That number is a live sanity check on the classifier's own call, generated fresh per sample — not a cached or hardcoded confidence figure.

For a read that doesn't confidently match anything, the same mechanism does something more useful than a wrong guess: it shows where the sequence actually sits in genetic space relative to known species, which is exactly the right answer when a reference database is incomplete — a very real situation for marine/deep-sea species, and directly responsive to the PS's own framing.

### 4.2 Conservation flagging tied to Indian law specifically

Not just a generic IUCN Red List category — the conservation cache cross-references the **Wildlife Protection Act, 1972 (as amended 2022)** schedule for each species, which is what actually matters for enforcement/policy use in Indian waters, not just an ecological status label.

### 4.3 Real biodiversity math, not templated numbers

Shannon diversity index, species richness, and evenness are computed live from the actual per-species read counts of whatever sample was just classified — same code path for the demo-seeded sample and a real upload, so there's no separate "demo mode" quietly using different logic than production.

### 4.4 Strand-orientation-robust classification

A real bug found and fixed during testing, worth its own line: DNA sequencing reads can come from either strand of the double helix with no way to know which in advance, but the training data (`scripts/simulate_reads.py`) only ever sampled the forward strand. A k-mer-based classifier sees an almost entirely different feature profile from the reverse-complement of the exact same sequence, so real-world reads on the "wrong" strand were collapsing from ~90% confidence down to single digits with the wrong species called. Fixed by classifying every read on both orientations and keeping whichever the model is more confident about — verified on 200 random reads: **97.0% accuracy on forward strand and 97.0% on reverse-complement, identical**, for a few hundred microseconds of extra compute per read. Worth a line in the demo script: this is the kind of failure mode that only shows up when you actually test with real-shaped data instead of trusting a training-set accuracy number, and it's fixed.

### 4.5 "Discovered" — unmatched/low-confidence reads as a first-class panel **[ROADMAP: currently mock data]**

The dashboard already has a dedicated panel framing low-confidence/no-match reads as *interesting* rather than errors — potential range extensions or undescribed species — with a "locate on map" action tying a read back to where it was actually found. Right now it's seeded with placeholder examples rather than the live classifier's own low-confidence output; wiring it to real data is a short, well-scoped next step (see §9) and worth having on the future-scope slide even if it's not demoed live yet.

---

## 5. Comparison

| Approach | Coverage of unknowns | Speed at scale | Conservation-aware | Transparency |
|---|---|---|---|---|
| Manual morphological identification | Fails on eDNA entirely — no organism to look at | Slow, expert-hours per sample | Depends entirely on the expert | High (expert reasoning) but not scalable |
| Raw BLAST search against NCBI | Returns nothing useful for species missing from the database | Slow for large read volumes | None built-in | Low — a percent-identity number, no ecological context |
| Single black-box ML classifier (typical hackathon approach) | Forces a best-guess label even on genuinely novel sequences | Fast | Usually none | Low — one label, one confidence score, no way to sanity-check it |
| **AquaVigil** | Confident calls get a species name *and* a live cross-model similarity check; low-confidence reads get a genetic-space position instead of a forced wrong guess | Fast — batched classical ML, no GPU required for the live path | Built-in, India-specific (IUCN + WPA schedule) | High — every call carries a real confidence score plus an independent second-model sanity check |

---

## 6. Why Ours Is Better

1. **It doesn't lie when it's unsure.** A single-model system with no fallback either forces a wrong species name onto a novel/rare sequence or shows a bare confidence percentage with nothing to compare it against. AquaVigil's similarity map gives judges (and real users) an honest answer for exactly the samples that matter most in eDNA work — the ones reference databases are worst at.
2. **Two models, one system, cross-checking each other** — not duplicated effort, a deliberate confidence layer that's rare in student projects at this stage.
3. **Built for India's actual legal framework**, not a generic "endangered/not endangered" flag — the Wildlife Protection Act schedule is what a government stakeholder actually needs to act on.
4. **It's a real, hosted, end-to-end product**, not a notebook or a slide-deck architecture. Upload → classify → results → biodiversity → conservation → similarity is a live pipeline today, deployed on Vercel + Render, not a mockup.
5. **Robust to a failure mode most hackathon classifiers never even test for**: unknown strand orientation. Verified real-read testing found the classifier's confidence collapsing to single digits on reverse-complemented reads — a realistic scenario for any real sequencing data — and it's fixed (§4.4), not just documented as a known limitation.
6. **Honest about its own limitations** — every still-mock or stubbed piece is explicitly labeled in the code and the docs, not silently presented as finished. That's a deployment/engineering-maturity signal worth stating out loud to judges, not hiding.

---

## 7. Scalability

- **Stateless classification path**: the FastAPI backend's classify/embed logic doesn't depend on per-request state beyond the uploaded sample, so it scales horizontally behind a load balancer with no architecture change — just more instances.
- **Batched inference, capped per request** (`MAX_READS_PER_CLASSIFY = 2000` today) — a deliberate, tunable ceiling that keeps response times predictable; raising it or adding a background-job queue for very large samples is a config change, not a redesign.
- **CPU-only inference, by design** — both live models (TF-IDF+LogReg and the k-mer PyTorch embedding model) run without a GPU, which matters directly for cost-effective scaling on real deployment infrastructure, not just for demo convenience.
- **Clear DB migration path**: schema is already defined relationally (`schema.sql`) with real foreign keys between samples/detections/species tables; moving from the current in-memory/SQLite setup to a managed Postgres instance for production scale is a connection-string change against an already-correct schema, not a rewrite.
- **Swappable classification core**: the router (`router.py`, `confidence.py`) already exists as an ensemble layer designed to let a stronger model (e.g. the BarcodeBERT-based classifier once trained — see §9) slot in alongside or instead of the current baseline, without changing the API contract the frontend depends on.
- **Reference space scales independently of the live path**: the similarity map's 500-species reference centroids are precomputed once and loaded as a static asset — growing the reference database to thousands of species doesn't add live compute cost, only a larger lookup table.

---

## 8. Future Scope

- **Finish training and wire in the BarcodeBERT + BiLSTM + attention classifier** as originally specified in the architecture — the code exists (`Model/model.py`, `attention.py`, `bilstm.py`), it just doesn't have a trained checkpoint yet. Published literature on BarcodeBERT specifically reports matching BLAST's species-level accuracy at ~55× the speed, and strongest-in-class performance at representing genuinely novel (never-seen-in-training) sequences — directly relevant to the similarity-map use case in §4.1.
- **Wire the classical ensemble router into the live API** — VSEARCH + Kraken2 agreement is already built and tested (`router.py`/`confidence.py`), just not connected to `/samples/{id}/classify` yet.
- **Live-cache GBIF occurrence data** instead of calling the public API directly from the browser at request time — better reliability for field/low-connectivity use and for demo conditions.
- **Persistent storage** — move samples and user accounts off in-memory/ephemeral SQLite onto a real managed Postgres instance with a persistent disk, so uploaded history survives a restart.
- **Grow the conservation cache** beyond its current 18 manually verified species toward full IUCN/WPA coverage of the 500-species reference set.
- **Wire the "Discovered" panel to real low-confidence classifier output** instead of its current placeholder examples (see §4.4) — the underlying data already exists in every classify call, it just isn't being routed there yet.
- **Real-time sequencer integration** (e.g. Oxford Nanopore) for field-deployable, near-live eDNA identification on research vessels rather than upload-after-the-fact.
- **Offline-first field kit mode** — a lightweight on-device version of the classifier for boats/remote sampling sites with no reliable connectivity, syncing results when back online.
- **Quantum-autoencoder novelty detection** (`quantum_research/`) — an early-stage research thread exploring a fundamentally different approach to flagging "this doesn't match anything known" beyond classical similarity search. Research prototype today, worth a forward-looking mention as a differentiator nobody else in the room will have.
- **Mobile app / field-technician-facing interface** for on-site sample logging tied directly to GPS-tagged collection points.

---

## 9. Honest Status Slide (recommended — judges respect this)

A short "what's real vs. what's next" slide heads off the toughest Q&A before it's asked, and reads as engineering discipline rather than a weakness:

**Live and real today:**
- Upload → classify → results → biodiversity indices → conservation flags → live similarity map, end to end
- Two independently trained models (98.66% / 98.85% test accuracy) both actually running in production
- Real JWT-based auth backend (signup/login tested), though not yet wired into the login UI
- Hosted on Vercel + Render, auto-deploying from `main`

**Explicitly not yet real (and why that's fine to say out loud):**
- The originally-specified BarcodeBERT deep learning classifier has no trained checkpoint yet — the TF-IDF baseline is carrying live classification today
- Distribution map falls back to 2 stub points if the live GBIF call fails
- "Discovered" panel is still illustrative/mock data
- Samples aren't persisted across a backend restart yet (in-memory store)
- The per-species "Scientific Datasheet" export (BLAST bit score, E-value, Q36 quality score, query coverage, sequencing platform, and the exported DNA sequence itself) is **entirely fabricated** — the "sequence" is generated by hashing the species *name string*, not from any real read, and the alignment metrics are simple formulas, not a real BLAST run. This one needs a decision before it goes anywhere near a judge: either add a visible "illustrative" disclaimer, or don't feature it in the pitch/demo at all. See §13 below.

---

## 10. Key Numbers (good for a stats slide)

| Metric | Value |
|---|---|
| Reference species | 500 |
| Marker genes | 3 (12S, 16S, COI) |
| Classifier A (live, primary) test accuracy | 98.66% |
| Classifier B (live, similarity) test accuracy | 98.85% |
| Simulated training reads | ~202,400 (161,920 train / 20,240 val / 20,240 test) |
| Conservation-flagged species cached | 18 (IUCN), 7 with a Wildlife Protection Act schedule |
| Live API endpoints | 12+ (auth, upload, classify, results, indices, conservation, distribution, similarity ×2) |
| Independently trained models running live | 2 |
| Classification accuracy, forward vs. reverse-complement strand (post-fix) | 97.0% / 97.0% — identical |
| Hosting | Vercel (frontend) + Render (backend), auto-deploy on push |

---

## 11. Suggested Live Demo Flow

1. Show the dashboard already populated (seeded demo sample) — species list, confidence, conservation flags.
2. Click an endangered/protected species → show the IUCN + Wildlife Protection Act flag.
3. Show the Biodiversity Assessment cards (Shannon/richness/evenness) — emphasize these are computed from this exact sample's counts.
4. Select a species → Genetic Similarity Map → point out the self-similarity number and explain it's a live second-model check, not a static number.
5. Upload a fresh sample live if time allows — walk through classify → results updating in real time.
6. Close on the "what's next" roadmap slide (§8) so the pitch ends on vision, not just current state.

---

## 12. Tech Stack (for an appendix slide)

| Layer | Tech |
|---|---|
| Frontend | React + TypeScript, Vite, Tailwind CSS, Zustand, Framer Motion, D3.js, Leaflet |
| Backend | FastAPI (Python), JWT auth (PyJWT + passlib/bcrypt), SQLite |
| ML — live classification | scikit-learn (5-mer TF-IDF + Logistic Regression) |
| ML — live similarity | PyTorch (custom `kmer_mean_mlp` embedding model) |
| ML — designed, not yet trained | BarcodeBERT (Transformer) + BiLSTM + self-attention head |
| Maps | Leaflet + GBIF live occurrence API |
| Hosting | Vercel (frontend), Render (backend) |

---

## 13. Idea/Title Slide Bullet Review

Went through the feature list drafted for the idea/title slide against what's actually implemented. Grouped by how safe each one is to present as-is.

### Solid — present these as real, no caveats needed

- **Genetic similarity map** — real, live, per-read (§4.1).
- **Locating unknown species** — same mechanism as above; a read that doesn't confidently match anything gets a genetic-space position instead of a forced wrong label.
- **IUCN status** — real, from the conservation cache.
- **Flagging endangered species** — real, and specifically tied to the India Wildlife Protection Act schedule, not just a generic IUCN label (worth saying explicitly on the slide — it's a stronger, more specific claim than most eDNA tools make).
- **Closest reference of the unknown species... with percent score and threshold** — real. This is exactly the live self-similarity + neighbor scoring in §4.1 (e.g. "99.84% similarity to reference centroid"). Good bullet, keep it.
- **Marker gene selection** — real; upload lets you choose 12S/16S/COI.
- **Number of reads processed is shown** — real (`reads_used` in the API response, shown on the dashboard).
- **Biodiversity assessment indices** — real, computed live from actual per-sample counts (Shannon, richness, evenness).
- **Strand-orientation robustness** (§4.4) — not on your list yet, but it's real, tested, and a genuinely uncommon thing for a student project to have caught and fixed. Worth adding as its own bullet.

### Needs a fix before it's demo-safe: "Researchers can export file where we have eDNA barcode sequence"

The export feature itself is real and works. The DNA sequence inside the exported file is not — `generateSequence()` (`frontend/src/lib/bioinformatics.ts`) builds it by hashing the **species name string**, not from the sample's actual classified reads. So right now, exporting the same species twice from two different samples produces the *identical* "sequence" both times, regardless of what was actually sequenced — that's the tell that would give it away under any real scrutiny. Two ways to make this bullet fully honest:
1. **(Recommended, and not a big lift)** Change the export to use the sample's own real reads for that species — `SAMPLES[id]["reads_by_species"][species]` already exists in the backend (I added it for the live similarity feature) and could be returned alongside the results, so the "exported sequence" becomes a real read from the actual sample instead of a name-hash. I can build this if you want it before the deck is finalized.
2. Keep it as-is but present it as an illustrative export format demo, not "here's the real barcode data" — riskier in Q&A, not recommended for a competition setting.

### Needs a fix or should be cut: "Bioinformatics alignment metrics (BLAST bit score, E-value, Q36 quality, query coverage)"

This is the one to be most careful with. None of these numbers come from a real alignment — `blastBitScore` is `350 + confidence*150`, `eValue` is `1.2e-${100 + confidence*50}`, `queryCoverage` is a hardcoded `99.4` for every single species, and the quality score is a hardcoded string (`"Q36.4"`) for every species too. There's no BLAST run happening anywhere in this pipeline. If a judge with any bioinformatics background asks "how are you computing a BLAST bit score without a database search," there's no honest answer for the current implementation — that's exactly the kind of question this bullet invites. Recommend cutting it from the idea slide entirely unless you have time to either (a) run a real lightweight alignment step, or (b) clearly relabel these as illustrative/placeholder in both the UI and the pitch.

### Split this one: "Ecological and habitat profile (Habitat Zone, Depth Range, Legal Schedule, Sequencing Platform)"

This bullet mixes one real field with three fabricated ones — worth separating on the slide:
- **Legal Schedule** — real, same Wildlife Protection Act data as the endangered-species flagging above. Fine to keep, maybe fold into that bullet instead.
- **Habitat Zone / Depth Range** — hardcoded for only 6 species (`TAXONOMY_MAP` in `bioinformatics.ts`); every other species (494 of 500) gets the same generic fallback ("10 - 150 m", "Marine Epipelagic") regardless of what it actually is. Not a real per-species lookup yet.
- **Sequencing Platform** — literally a hardcoded string, `"Illumina MiSeq (2x300bp PE)"`, shown identically for every species. There's no real sequencer anywhere in this pipeline (the whole dataset is simulated) — this line is the easiest one for a judge to catch as fabricated, since it's not even species-dependent. Recommend cutting this specific line regardless of what happens to the rest of the bullet.

### Bottom line for this slide

Of your 10 bullets, 6 are fully real as written, 1 (the exported barcode sequence) has a straightforward real fix available, and 2 (BLAST/alignment metrics, sequencing platform) are currently fabricated with no quick real fix — cut or clearly relabel those before presenting. Happy to build the real-sequence-export fix now if you want that bullet to be fully solid for the deck; the alignment-metrics one would need an actual (even lightweight) alignment step to become real, which is a bigger scope decision.
