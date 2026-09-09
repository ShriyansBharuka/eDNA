# ANVESH

An eDNA-based marine species identification system for SIH 2026 (PS SIH25042, Ministry of Earth Sciences) — combines an ensemble classifier router, a custom BarcodeBERT-based deep learning classifier, and a conservation-status-aware dashboard with biodiversity indices and species mapping.

**Live**: see [Deployment](#deployment) below for the hosted URLs once set up — check there before pulling the repo just to see what changed.

## Team & where your tasks are

| Person | Owns | 
|---|---|
| Shriyans | Data layer + integration |
| Sunanda | Backend (ensemble router, confidence layer, indices) |
| Darshan | DL classifier (BarcodeBERT + custom head) |
| Aarya | Transformers/GNNs (paired on the classifier, owns the similarity map projection) |
| Leena | Frontend (dashboard, geographic map, similarity map UI) |
| Aarav | Conservation data research (IUCN/Wildlife Act), quantum research thread, documentation |

For how the system actually fits together end to end, see
[`docs/full-pipeline-walkthrough.md`](docs/full-pipeline-walkthrough.md).

## What's in this repo right now

- `schema.sql` — the four core tables: `samples`, `detections`, `species_cache`, `conservation_status`. (The live backend currently keeps samples in memory rather than this DB — see `backend/main.py`.)
- `backend/main.py` — the live FastAPI app. `/samples/upload` → `/samples/{id}/classify` → `/samples/{id}/results` / `/indices` is a real pipeline now (see below), as are `/species/{name}/conservation-status` and `/species/{name}/similarity`. `/species/{name}/distribution` is still the original stub — no GBIF integration yet.
- `backend/classifier.py` — loads the trained 5-mer TF-IDF + Logistic Regression baseline (`Model/checkpoints/`, 98.66% test accuracy across 500 species) and classifies real uploaded reads.
- `backend/similarity.py` — serves the precomputed genetic similarity reference map (`models/kmer_embedding_classifier/similarity_map/`): real UMAP coordinates + real cosine-similarity nearest-neighbors from a separately trained embedding model (98.85% test accuracy).
- `backend/reads_io.py` — minimal FASTA/FASTQ(.gz) parser for uploaded sample files.
- `backend/biodiversity_indices.py` / `species_counts.py` — real Shannon/richness/evenness math, computed from actual per-sample species counts.
- `data/component_6/` — conservation flagging: `conservation_flag.py` looks a species up against a cached IUCN/CITES/Wildlife-Protection-Act table (`species_cache.json`, 18 species so far — most detected species won't be in it yet) with no live external API calls.
- `Model/` — the trained k-mer TF-IDF baseline (`checkpoints/`) that's actually wired in, plus the originally-designed BarcodeBERT + BiLSTM + attention architecture (`model.py`, `attention.py`, `bilstm.py`) which has **no trained checkpoint** — real code, not yet usable.
- `models/kmer_embedding_classifier/` — a second, separately trained PyTorch classifier (`kmer_mean_mlp`, 98.85% accuracy) that produces the embeddings behind the similarity map above. Not used for live classification (that's still the sklearn baseline) — see its own `SIMILARITY_MAP_README.md`.
- `backend/router.py` / `confidence.py` / `pipeline_output.py` — a real, tested two-classical-tool ensemble (VSEARCH + Kraken2 agreement) and confidence-scoring path. Not wired into the live endpoints — there's no live VSEARCH/Kraken2 execution for an arbitrary upload, so this is a separate path from what's actually running today.
- `quantum_research/qae_novelty_taxonomy.ipynb` — an early-stage quantum-autoencoder notebook exploring novelty detection. Research prototype, not a wired feature — see `docs/architecture.md` for why it's scoped that way.
- `data/reference/` — the curated marine vertebrate reference database (12S/16S/COI), pulled from OceanOmics-AmpliconReference.
- `scripts/simulate_reads.py` + `simulated_data/` — the simulated training/test dataset (reads + ground-truth manifest) that both trained models were built and evaluated against, and that seeds the dashboard's demo state on backend startup.
- `frontend/` — the full dashboard UI: scroll-driven video hero, real upload flow, species list with real confidence/conservation styling, real biodiversity assessment, a "Discovered" panel (still mock — see below), a distribution map (mock points, real OpenStreetMap tiles), and a real genetic similarity map.
- `render.yaml` — Render Blueprint for one-click backend deploy. See [Deployment](#deployment).
- `docs/architecture.md` / `pipeline.md` / `full-pipeline-walkthrough.md` — system design, and a full end-to-end walkthrough of what actually runs.
- `docs/paper/` — the IEEE research paper written up from this project's findings.

## Running the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Then visit `http://127.0.0.1:8000/docs` for the interactive API page — every route can be tried directly from the browser. Startup automatically seeds a demo sample (id `1`) by classifying a real slice of `simulated_data/simulated_reads.fastq`, so `/samples/1/results` has real data immediately, no upload needed.

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

Then visit `http://localhost:5173`. It proxies `/api/*` to the backend on `:8000` in dev, so run that alongside it for real data — otherwise the dashboard just falls back to its empty state.

## Deployment

Frontend on **Vercel**, backend on **Render** — both auto-deploy from `origin/main` on every push, so once set up nobody needs to pull the repo to see the latest state, just open the URL.

**Backend (Render)** — one-time setup:
1. Render dashboard → New → Blueprint → pick this repo. Render reads `render.yaml` at the repo root and configures everything (root dir `backend/`, build/start commands, Python version via `backend/runtime.txt`) automatically.
2. Free tier spins the service down after 15 min of no traffic — the first request after a quiet spell takes ~30s to wake up. Fine for a team checking progress, worth knowing if timing a live demo.
3. Note the resulting URL (`https://<something>.onrender.com`) — the frontend needs it next.

**Frontend (Vercel)** — one-time setup:
1. Vercel dashboard → Add New → Project → pick this repo → set **Root Directory** to `frontend` (this is a monorepo, Vercel needs to be told where the app actually lives).
2. Framework preset auto-detects as Vite; default build command (`npm run build`) and output directory (`dist`) are correct as-is.
3. Add an environment variable: `VITE_API_BASE_URL` = the Render URL from above (no trailing slash). Without this the deployed frontend tries to call its own domain for `/api/*`, which doesn't exist outside local dev's proxy.
4. Deploy. Every push to `main` redeploys automatically from then on.

Backend CORS is already wide open (`allow_origins=["*"]`) since there's no cookie/session auth anywhere in this API, so Vercel's preview-deploy URLs (which change per-branch) work with zero extra config.

**Known limitation**: the backend's sample store is in-memory (see `backend/main.py`) — a Render free-tier sleep/wake cycle wipes any *uploaded* samples (the seeded demo sample re-seeds itself automatically on every startup, so that part's fine either way).

## Current status

- [x] Database schema defined
- [x] Reference database (12S/16S/COI) in the repo
- [x] Simulated read generator + labeled dataset (`scripts/simulate_reads.py`, replacing the originally-planned Nextflow pipeline — see the note in `docs/roadmap.md`)
- [x] Real species classifier live: upload → classify → results/indices, using a trained 98.66%-accuracy baseline
- [x] Real conservation flagging, real biodiversity indices, wired into the live endpoints
- [x] Real genetic similarity map — precomputed reference graph from a second trained embedding model
- [x] Frontend dashboard fully built and wired to real data end-to-end
- [x] CORS + env-based API URL, deploy configs — ready to host (this pass)
- [ ] BarcodeBERT + custom DL classifier (component 3, as originally designed) — architecture exists, no trained checkpoint
- [ ] Two classifiers doing overlapping jobs (sklearn baseline live, PyTorch embedding model only used for its precomputed map) — worth eventually unifying
- [ ] `router.py` / `confidence.py` / `pipeline_output.py` (two-classical-tool ensemble) — real and tested, not wired into live endpoints
- [ ] Conservation cache only covers 18 of 500 possible species; of those, only 7 have a Wildlife Protection Act schedule filled in
- [ ] GBIF live integration — distribution map still returns mock occurrence points
- [ ] Real sample collection coordinates — upload never captures them; the map's "this sample" marker is a hardcoded location
- [ ] Discovered (unmatched-reads) panel — still fully mock, despite the real classifier now producing genuine low-confidence calls that could drive it
- [ ] Login/Signup — explicit placeholder UI, no auth backend
- [ ] Known bug: nested `<button>` in the species list / conservation badge (invalid HTML, harmless but flagged)
- [ ] Persistence — samples are in-memory only, lost on backend restart (see Deployment note above)
- [ ] Automated tests — none yet, beyond ad hoc `__main__` smoke-checks in individual modules
- [ ] Quantum-autoencoder novelty detection — research notebook only, not a wired feature

## Notes on stub vs. real

Most of `backend/main.py`'s routes now run real logic — see the checklist above for exactly which ones. `/species/{name}/distribution` is the one still returning hardcoded placeholder points; its response still carries a `"note"` field saying so. That convention — a `"note"` naming what's still placeholder — is worth keeping wherever a route isn't fully real yet, so nobody mistakes stub data for something real without needing to ask.

## License

Source code is MIT licensed — see [`LICENSE`](LICENSE).

The MIT license covers the code only. Reference sequence data, trained model
checkpoints, and image/video assets carry separate upstream terms and
attribution requirements — see
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) before redistributing.
