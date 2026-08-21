# AquaVigil — Starter Kit (Phase 1)

This is real, tested, running code — not a mockup. It covers your two Phase 1 checklist items from the roadmap: the database schema and the API contract (stubbed but in the exact response shape everyone else will build against).

## What's in here

- `schema.sql` — the four tables from the architecture doc: `samples`, `detections`, `species_cache`, `conservation_status`.
- `backend/main.py` — a FastAPI app implementing all 6 endpoints from the API contract. Each one returns clearly-labeled placeholder data right now, in the exact shape the real response will eventually have — this is what "the API contract is frozen" actually means in practice: Leena and Sunanda can start building against these routes today.

## How to run it

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Then visit `http://127.0.0.1:8000/docs` — FastAPI auto-generates an interactive page where you (or anyone on the team) can try every endpoint directly in the browser. Worth sending that link to the whole team once it's running, so everyone can see the real contract for themselves instead of just reading about it.

## Your actual next steps, in order

1. **Run this today** — confirm it works on your machine (it's already been tested and works as-is).
2. **Push it to a shared team repo** — this becomes the one place everyone pulls from. Do this before anything else below, since Leena and Sunanda are unblocked the moment this exists somewhere shared.
3. **Clone `OceanOmics-AmpliconReference`** into a `/reference` folder in the same repo — `git clone https://github.com/MinderooFoundation/OceanOmics-AmpliconReference.git`. You already have a real 30-species fragment of this from earlier in this project (`AquaVigil_Sample_Dataset`) — use that immediately to test your schema/API against real-shaped data while you work on the full pipeline, rather than waiting.
4. **Set up Nextflow + Docker**, then get `nf-core/readsimulator` running — this is the slower, more fiddly task, so start it in parallel with step 2–3, not after.
5. Once the simulator is producing real labeled reads, that's your handoff to Darshan + Aarya (Phase 2 in the roadmap).

## Note on the stub responses

Every endpoint returns a `"note"` field naming exactly which teammate's work will eventually replace that placeholder. Leave those notes in as you build — they're a cheap, visible way for the whole team to track which routes are still stubbed versus real, without anyone needing to ask.
