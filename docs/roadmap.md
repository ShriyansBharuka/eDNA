# AquaVigil — Team Roadmap & Connection Map

### What everyone does, week by week, and exactly how each person's output becomes the next person's input

> Weeks below are relative ("Week 1, Week 2...") — map them onto your actual SIH calendar. The final phase is written as a 36-hour grand-finale sprint regardless of when that lands for you.

---

## 0. The six roles (quick reference)

| Role | Person | Primary components (from the task breakdown) |
|---|---|---|
| Data + Integration lead | Shriyans | Component 1 (Data Layer), Component 10 (infra) |
| Sunanda (backend specialist) | — | Components 2, 4, 6 (backend half) |
| Darshan (DL/RL specialist) | — | Component 3 (primary) |
| Aarya (Transformers/GNNs specialist) | — | Component 3 (paired), Component 7 (similarity map upgrade) |
| Leena (frontend specialist) | — | Components 7 (UI half), 8, 9 |
| Aarav (quantum models/research) | — | Component 6 (research half), documentation, pitch narrative |

---

## 1. Phase-by-phase roadmap

### Phase 1 (Week 1) — Setup, everyone works in parallel, nobody blocks anybody yet

| Person | This week |
|---|---|
| Shriyans | Repo setup. Clone OceanOmics-AmpliconReference. Run the custom Python read simulator (`scripts/simulate_reads.py` — Nextflow/`nf-core/readsimulator` was evaluated and skipped for this build; see the note at the bottom of this doc). Define the database schema (`samples`, `detections`, `species_cache`, `conservation_status`) and the API contract [the agreed shape of every endpoint's request/response — frozen early so others can build against it without waiting]. Stub out the API routes so they return placeholder JSON matching that contract. |
| Sunanda (backend specialist) | Work with Shriyans to finalize the API contract. Containerize [package with Docker] the 2–3 chosen classical classifier tools, confirm each runs standalone on a test sequence. |
| Darshan (DL/RL specialist) | Set up Python 3.11/3.12, PyTorch, `transformers`. Load BarcodeBERT, confirm it produces an embedding for a test DNA sequence — the "does it even work" milestone. |
| Aarya (Transformers/GNNs specialist) | Same environment setup, working alongside Darshan. Start prototyping the custom self-attention + BiLSTM head architecture on dummy data — doesn't need real data yet, just needs to run. |
| Leena (frontend specialist) | Wireframe the dashboard on paper or Figma. Scaffold the React project. Build the UI shell against **mock JSON that matches Shriyans's API contract exactly** — this is what lets frontend work start immediately without waiting on backend. |
| Aarav (quantum models/research) | Register for IUCN Red List API access. Start compiling the Wildlife Protection Act schedule lookup table. Begin literature notes on the research paper for later documentation/pitch use. |

**End-of-phase milestone:** every person's tool/environment runs standalone. No real data is flowing between people yet — but the API contract is frozen, which is what unblocks Phase 2's frontend and backend work from proceeding independently.

---

### Phase 2 (Weeks 2–3) — First real outputs, first real handoffs

| Person | This week |
|---|---|
| Shriyans | Finish generating the simulated training dataset via `scripts/simulate_reads.py` — real reads with known species labels attached, in `simulated_data/manifest.csv`. **Hands this off** to Darshan + Aarya and to Sunanda (backend specialist). |
| Sunanda (backend specialist) | Build the ensemble router (marker gene → preferred classical tool) and consensus voting logic. Test it against Shriyans's real simulated dataset. |
| Darshan + Aarya | Train the custom head on Shriyans's real labeled dataset. Evaluate accuracy on held-out data. |
| Leena (frontend specialist) | Continue building the dashboard against mocks. Start the Geographic Map (GBIF integration) — this track has no dependency on anyone else's work, good use of otherwise-blocked time. |
| Aarav (quantum models/research) | Finish the Wildlife Act lookup table. **Hands this off** to the Sunanda (backend specialist). Start drafting the pitch narrative. |

**End-of-phase milestone:** classical ensemble works on real data. DL model is trained and evaluated, standalone (not yet plugged into the rest of the system). Geographic map is functional against real GBIF data. Wildlife Act table is ready and handed off.

---

### Phase 3 (Week 4) — Integration begins

| Person | This week |
|---|---|
| Darshan + Aarya | Package the trained model as a callable prediction function [input: a DNA sequence, output: species prediction + embedding vector]. **Hands this off** to the Sunanda (backend specialist). |
| Sunanda (backend specialist) | Wire the DL model's predictions together with the classical tools' outputs into the confidence layer. Implement conservation flagging using the Wildlife Act table. Replace the Phase 1 stub API routes with real logic. |
| Aarya (Transformers/GNNs specialist) | Once embeddings are stable, start the similarity map's backend piece — the UMAP/GNN projection into 2D. **Hands off** the projected coordinates to the Leena (frontend specialist). |
| Leena (frontend specialist) | Swap dashboard mocks for real API calls — species list, confidence scores, and conservation flags are now showing real data for the first time. |
| Aarav (quantum models/research) | Support documentation. Help sanity-check the Wildlife Act table against real detections coming out of the pipeline. |

**End-of-phase milestone:** the backend is serving real, integrated classification + confidence + conservation data through the API. The frontend is displaying real data for the species list and conservation flags — the first true end-to-end slice of the product.

---

### Phase 4 (Week 5) — Remaining features

| Person | This week |
|---|---|
| Sunanda (backend specialist) | Build the Biodiversity Indices engine (Shannon index, richness, evenness) — genuinely simple enough that this could be pulled earlier into Phase 2 if there's spare capacity; flagging it here as the latest-acceptable slot. |
| Leena (frontend specialist) | Wire up the Similarity Map using the Transformers specialist's projection data. Finish the biodiversity index cards on the dashboard. |
| Aarya (Transformers/GNNs specialist) | Finish the GNN-based similarity map enhancement if time allows; otherwise confirm the simpler UMAP-only fallback is solid. |
| Shriyans | Begin Docker Compose integration — start wiring every service to launch together with one command. |
| Aarav (quantum models/research) | Finalize the pitch deck draft. |

**End-of-phase milestone:** the full pipeline works end to end for at least one real test sample — every dashboard piece (indices, conservation flags, both maps) is showing real data, not mocks.

---

### Phase 5 (Week 6) — Integration testing and polish

| Person | This week |
|---|---|
| Shriyans | Full end-to-end testing. Finalize Docker Compose so the whole system runs with one command. |
| Sunanda + Leena | Joint bug-fixing pass — this is where mismatches between what backend sends and what frontend expects actually surface, so plan real pair time here. |
| Darshan + Aarya | Stretch goals if time remains — BarcodeBERT fine-tuning, or replicating the paper's clade-exclusion robustness test on your own model. |
| Aarav (quantum models/research) | Rehearse the pitch narrative with the full team. |

**End-of-phase milestone:** a stable, demoable system, plus a rehearsed pitch.

---

### Phase 6 (Final sprint — grand finale days)

All hands, regardless of role:
- [ ] Pre-cache every external API response (IUCN, GBIF) for your demo species — nothing live-calls an external service during judging.
- [ ] Final bug bash.
- [ ] Two full rehearsal run-throughs of the live demo.
- [ ] Record a backup video of one clean, successful run, in case the live demo breaks.

---

## 2. The connection map — every handoff, explicitly

This is the part that answers "how does everything actually connect": each arrow below is a real, concrete artifact moving from one person to another, not just a vague dependency.

1. **Shriyans → Darshan + Aarya:** the labeled simulated dataset — FASTQ files [DNA read files] plus a manifest mapping each read to its true species (same structure as the sample dataset from earlier in this project).
2. **Shriyans → Sunanda (backend specialist):** the same simulated dataset, used to test the ensemble router.
3. **Shriyans → everyone:** the API contract — the frozen list of endpoints and their exact request/response shape, agreed in Phase 1. This is what lets frontend and backend build in parallel without either one waiting on the other.
4. **Aarav (quantum models/research) → Sunanda (backend specialist):** the Wildlife Act lookup table (a CSV: species name → protection schedule/status).
5. **Darshan + Aarya → Sunanda (backend specialist):** the trained model, packaged as a single callable function — sequence in, prediction + embedding out.
6. **Aarya (Transformers/GNNs specialist) → Leena (frontend specialist):** the similarity map's projected coordinates (2D positions + distances per species, as JSON).
7. **Sunanda (backend specialist) → Leena (frontend specialist):** the live API itself, replacing every mock the frontend was built against in Phase 1.

**The one thing that makes this whole plan work:** the API contract from Phase 1 has to be locked early and not casually changed later — it's the single shared agreement that lets the backend and frontend tracks run in parallel for weeks instead of one waiting on the other.

---

## 3. What's still a genuine blocker

Components 1 (Data Layer) and 3 (BarcodeBERT + custom head) remain the two pieces everything else depends on, unchanged from the earlier breakdown. Everything in this roadmap is sequenced around getting those two moving first in Phase 1–2, specifically so their outputs are ready before Phase 3's integration work needs them.

## 4. Note on a scope change from the original plan

Nextflow + `nf-core/readsimulator` (the tool originally planned for generating simulated training reads) was evaluated and deliberately skipped for this build, given the timeline. `scripts/simulate_reads.py` — a custom, tested, much simpler Python script — replaces it. Same core purpose (fragment real reference sequences, add realistic sequencing error, produce reads with known ground truth), simpler error model. Worth knowing if this comes up in the pitch: be upfront that it's a custom lightweight simulator inspired by the same approach as the research paper, not literally the paper's own tooling.
