# AquaVigil

An eDNA-based marine species identification system for SIH 2026 (PS SIH25042, Ministry of Earth Sciences) — combines an ensemble classifier router, a custom BarcodeBERT-based deep learning classifier, and a conservation-status-aware dashboard with biodiversity indices and species mapping.

## Team & where your tasks are

| Person | Owns | 
|---|---|
| Shriyans | Data layer + integration |
| Sunanda | Backend (ensemble router, confidence layer, indices) |
| Darshan | DL classifier (BarcodeBERT + custom head) |
| Aarya | Transformers/GNNs (paired on the classifier, owns the similarity map projection) |
| Leena | Frontend (dashboard, geographic map, similarity map UI) |
| Aarav | Conservation data research (IUCN/Wildlife Act), quantum research thread, documentation |

Full breakdown of what each of those actually involves — concrete task checklists, tools needed, and how your output hands off to the next person — is in [`docs/task-breakdown.md`](docs/task-breakdown.md) and [`docs/roadmap.md`](docs/roadmap.md). Read your row, then open those docs for the specifics.

## What's in this repo right now

- `schema.sql` — the four core tables: `samples`, `detections`, `species_cache`, `conservation_status`.
- `backend/main.py` — a FastAPI app implementing all 6 endpoints from the API contract. Each still returns clearly-labeled placeholder data, in the exact shape the real response will eventually have — this is the frozen contract everyone builds against.
- `backend/router.py` — the ensemble router (component 2): marker-gene → preferred classical tool, plus consensus voting between VSEARCH and Kraken2. Evaluated against the real 12S dataset (`backend/evaluate_router.py`).
- `backend/confidence.py` — the confidence layer (component 4): combines classifier agreement with match identity, with a genus-confusion safeguard below 97% identity so two tools agreeing on a close relative doesn't read as high confidence.
- `data/component_6/` — conservation flagging (component 6): `conservation_flag.py` looks a species up against a cached IUCN/CITES/Wildlife-Protection-Act table (`species_cache.json`, 18 species so far) with no live external API calls, so the demo never depends on network access.
- `backend/pipeline_output.py` — wires components 2 → 4 → 6 together standalone (species names in, confidence score + conservation flag out) as a working demonstration of the full chain.
- `quantum_research/qae_novelty_taxonomy.ipynb` — an early-stage quantum-autoencoder notebook exploring novelty detection (flagging a read as "not matching anything known" rather than forcing a wrong call). Research prototype, not a wired feature — see `docs/architecture.md` for why it's scoped that way.
- `data/reference/` — the curated marine vertebrate reference database (12S/16S/COI), pulled from OceanOmics-AmpliconReference.
- `scripts/simulate_reads.py` + `simulated_data/` — the simulated training/test dataset (reads + ground-truth manifest) that `evaluate_router.py` and friends test against.
- `frontend/` — the full dashboard UI: scroll-driven video hero, upload flow, species list with confidence/conservation styling, biodiversity assessment, a "Discovered" panel for reads that don't match anything in the reference database, a GBIF/OpenStreetMap distribution map, and a genetic similarity map. Built against the live API contract via a dev proxy, so it already works end-to-end against the stub data below. See [Running the frontend](#running-the-frontend).
- `docs/architecture.md` — the full system design, six components, all the "why" behind each piece.
- `docs/task-breakdown.md` — what each component actually requires to build.
- `docs/roadmap.md` — the phase-by-phase plan and exactly how each person's work connects to the next.

## Running the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Then visit `http://127.0.0.1:8000/docs` for the interactive API page — every route can be tried directly from the browser.

The `router.py` / `confidence.py` / `pipeline_output.py` modules above aren't imported into `main.py` yet (see "Notes on the stub responses"), but you can run each standalone — `python confidence.py` or `python pipeline_output.py` from `backend/` runs its own smoke test and prints the result.

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

Then visit `http://localhost:5173`. It proxies `/api/*` to the backend on `:8000`, so run that alongside it for real data — otherwise the dashboard just falls back to its empty state. Note the on-page branding currently reads "Gravity Falls" (a frontend-only display choice); the project and repo are still AquaVigil everywhere else.

## Current status

- [x] Database schema defined
- [x] API contract frozen and stubbed
- [x] Reference database (12S/16S/COI) in the repo
- [x] Simulated read generator + labeled dataset (`scripts/simulate_reads.py`, replacing the originally-planned Nextflow pipeline — see the note in `docs/roadmap.md`)
- [x] Ensemble router + consensus voting, evaluated against real 12S data (Sunanda)
- [x] Confidence layer with identity-gated agreement scoring (Sunanda)
- [x] Conservation flagging against a cached IUCN/CITES/WPA table (Aarav + Sunanda)
- [x] Components 2/4/6 wired together standalone end-to-end (`backend/pipeline_output.py`)
- [x] Frontend dashboard built and wired to the live (stub) API contract
- [ ] `backend/main.py`'s actual routes still return the original placeholder data — router/confidence/conservation are built and tested but not yet imported into the live endpoints
- [ ] BarcodeBERT + custom DL classifier (component 3 — Darshan/Aarya) — not yet in the repo
- [ ] Similarity-map projection endpoint (component 7 backend half — Aarya) — frontend has the UI wired against mock coordinates in the meantime
- [ ] GBIF live integration — frontend map currently reads mock occurrence points from the stub `/species/{name}/distribution` route
- [ ] Docker Compose / one-command launch
- [ ] Quantum-autoencoder novelty detection — research notebook only, not a wired feature (see above)

## Notes on the stub responses

`backend/main.py`'s endpoints each return a `"note"` field naming exactly which teammate's work will eventually replace that placeholder data. Leave those notes in as you build — cheap, visible way to track what's still stubbed vs. real without anyone needing to ask. As of now that's still every route: the real logic exists in `router.py` / `confidence.py` / `data/component_6/conservation_flag.py`, it just hasn't been imported into `main.py`'s handlers yet — that wiring is the next concrete step for whoever picks up component 2/4/6 integration.