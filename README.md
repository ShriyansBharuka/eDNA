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
- `backend/main.py` — a FastAPI app implementing all 6 endpoints from the API contract. Each currently returns clearly-labeled placeholder data, in the exact shape the real response will eventually have — this is the frozen contract everyone builds against.
- `data/reference/` — the curated marine vertebrate reference database (12S/16S/COI), pulled from OceanOmics-AmpliconReference.
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

## Current status

- [x] Database schema defined
- [x] API contract frozen and stubbed
- [x] Reference database (12S/16S/COI) in the repo
- [ ] Nextflow + Docker setup, `nf-core/readsimulator` running (in progress — Shriyans)
- [ ] Everything else — see `docs/roadmap.md` for what's next per person

## Notes on the stub responses

Every endpoint returns a `"note"` field naming exactly which teammate's work will eventually replace that placeholder data. Leave those notes in as you build — cheap, visible way to track what's still stubbed vs. real without anyone needing to ask.