# ANVESH (ANVESH) — Complete System Pipeline, Deep Dive

> Written for anyone joining the team who needs to understand **everything** —
> not just "what does it do" but "which file, which function, which line
> decides that." Every claim in this document was checked directly against
> the code on disk, not recalled from memory or the pitch deck. Where
> something is a stub, mock, or not-yet-wired, that is stated explicitly —
> nothing here is rounded up to sound more finished than it is.
>
> Project naming note: the repo, backend title, and database file are still
> **ANVESH** everywhere. **ANVESH** is the on-page display name shown in
> the frontend (navbar, hero, footer, export filenames) — a branding choice
> layered on top, not a renamed repo.

---

## Table of contents

1. [30-second summary](#1-30-second-summary)
2. [The four model/tool artifacts — what's actually live](#2-the-four-modeltool-artifacts--whats-actually-live)
3. [Data layer](#3-data-layer)
4. [Backend — file by file](#4-backend--file-by-file)
5. [The live request lifecycle, end to end](#5-the-live-request-lifecycle-end-to-end)
6. [Authentication (GitHub OAuth)](#6-authentication-github-oauth)
7. [Frontend — file by file](#7-frontend--file-by-file)
8. [The demo dataset (guaranteed endangered-species flagging)](#8-the-demo-dataset-guaranteed-endangered-species-flagging)
9. [Known gaps, stubs, and honest limitations](#9-known-gaps-stubs-and-honest-limitations)
10. [Deployment & environment variables](#10-deployment--environment-variables)
11. [Glossary](#11-glossary)

---

## 1. 30-second summary

A user uploads a raw eDNA read file (FASTQ/FASTA). The backend parses it,
classifies every read against a closed set of 500 marine species using a
trained classical ML model, cross-references each detected species against a
small cached conservation-status table, computes biodiversity statistics
from the per-species counts, and serves all of that to a React dashboard.
Separately, when the user clicks into a species, the dashboard also embeds
that species' *own real reads* through a second, different trained model to
show a genetic-similarity map, and queries GBIF (live, client-side) for a
geographic occurrence map. Login is optional and, as of this pass, is real
GitHub OAuth (previously a non-functional placeholder form).

Four separate model/tool artifacts exist in this repo. Only two are wired
into anything the user actually sees — see [§2](#2-the-four-modeltool-artifacts--whats-actually-live).

---

## 2. The four model/tool artifacts — what's actually live

This is the single most confusing thing about this repo if you haven't read
this section, because two unrelated models both hit ~98-99% accuracy and
both are real, trained, checkpointed models — but only one of them is the
thing actually calling species names in the live app.

| # | Artifact | Type | Live in the app? | What it does |
|---|---|---|---|---|
| **A** | 5-mer TF-IDF + Logistic Regression | Classical ML (no neural net) | **YES — this classifies every uploaded read** | species name + confidence per read |
| **B** | `kmer_mean_mlp` (custom PyTorch) | Small feedforward neural net | **YES — but only for the similarity map** | embeds a read into 192-D space for nearest-neighbor comparison |
| **C** | BarcodeBERT + BiLSTM + Self-Attention | Real pretrained Transformer | **NO** — real code, never trained to convergence, no checkpoint | was the originally-designed classifier |
| **D** | VSEARCH + Kraken2 ensemble router | Classical bioinformatics tools + hand-written scoring | **NO** — built, tested standalone, never called from the API | was meant to cross-check two classical tools per marker gene |

### Directory map (the part that trips people up)

```
models/
├── transformer/                    ← misleading name, read carefully
│   ├── model.py, attention.py,     ← Artifact C: the real BarcodeBERT
│   │   bilstm.py, train.py           architecture. No trained checkpoint.
│   ├── kmer_baseline.py            ← the training script for Artifact A
│   │                                  (confusingly NOT the Transformer)
│   ├── checkpoints/
│   │   ├── tfidf_5mer_vectorizer.pkl      ← Artifact A's real checkpoint
│   │   ├── kmer_logistic_regression.pkl   ← Artifact A's real checkpoint
│   │   └── label_mapping.json             ← the 500-species vocabulary
│   └── results/final_results.json  ← Artifact A's real eval numbers
│
└── kmer_embedding_classifier/      ← Artifact B (unambiguous folder name)
    ├── src/model.py                ← KmerMeanMlpClassifier
    ├── checkpoints/final_best_model.pt
    ├── results/final_metrics.json
    └── similarity_map/             ← precomputed reference graph
```

The `transformer/` folder holds Artifact C's *code* but Artifact A's *trained
checkpoint*. There is no `.pt`/`.bin`/`.safetensors` for the actual
Transformer anywhere in this repo — Artifact C is real code that has simply
never been trained to a usable state (`train.py` sets `EPOCHS = 1`,
`MAX_TRAIN_BATCHES = 100`, explicitly commented `# Stability test`).

### Artifact A — the actual classifier (`backend/classifier.py`)

- 5-mer TF-IDF vectorizer → Logistic Regression, 500-way closed-set classifier.
- Trained on `simulated_data/manifest.csv`: 161,920 train / 20,240
  validation / 20,240 test reads, 1,416 TF-IDF features.
- Real evaluation (`models/transformer/results/final_results.json`):
  **98.656% test accuracy**, macro-F1 0.9895.
- Every uploaded read is classified **twice** — once as-is, once as its
  reverse-complement (full IUPAC ambiguity-code table, not just ACGT) — and
  whichever orientation the model was more confident about wins. This was
  added because the training data (`scripts/simulate_reads.py`) only ever
  fragments the forward strand of the reference genome, so a real read
  landing on the wrong strand originally dropped from ~90% confidence to
  5-49% confidence *on the wrong species* — classifying both orientations
  fixes this without retraining.
- Closed-set limitation: any organism not among the 500 trained species gets
  a forced, low-confidence wrong guess — there is no "I don't know" output
  from softmax. This is why the app has a confidence threshold (below) to
  catch those cases rather than presenting a bogus species name as fact.

### Artifact B — the similarity-map embedder (`backend/embedding.py`)

- Architecture: embedding lookup (192-D per 6-mer, overlapping, stride 1) →
  masked mean pooling → LayerNorm → Dropout → Linear(192→512) → GELU →
  Dropout → Linear(512→500). 1,142,516 trainable parameters.
- Trained independently from Artifact A, on the same species set but its own
  train/val/test split (161,889 / 20,282 / 20,229 — slightly different
  counts than Artifact A's split, confirming these are genuinely two
  separate training runs, not the same data reused).
- Real evaluation (`models/kmer_embedding_classifier/results/final_metrics.json`):
  **98.853% test accuracy**, macro-F1 0.9911.
- **Critically: the live app never calls this model's own species
  prediction (`argmax` of its final layer).** `backend/embedding.py` only
  ever pulls the 192-D embedding *before* that final classification layer.
  It has its own trained classification head, evaluated to the accuracy
  above, but that head's output is unused in production — only the
  embedding vector is used, for nearest-neighbor comparison.

### Artifact C — BarcodeBERT (`models/transformer/`)

- Loads real pretrained weights from HuggingFace
  (`AutoModel.from_pretrained("bioscan-ml/BarcodeBERT", trust_remote_code=True)`)
  — a genuine barcode-specific BERT-style model, not a placeholder.
- Custom head on top: BiLSTM → self-attention → mean pooling →
  classification layer, exactly matching `docs/architecture.md`'s original
  design.
- `train.py` was only ever run as a 1-epoch/100-batch smoke test
  ("does it crash"), not a real training run. **Zero live impact.**

### Artifact D — VSEARCH + Kraken2 router (`backend/router.py`, `confidence.py`, `pipeline_output.py`)

- Real, hand-tested logic: `router.py` picks which classical tool (VSEARCH
  or Kraken2) to trust per marker gene and computes agreement; `confidence.py`
  turns that into a weighted confidence score (60% agreement, 40% sequence
  identity); `pipeline_output.py` wires those two together with
  `conservation_flag.py` into one `build_detection()` call.
- Every one of those files has a working `if __name__ == "__main__":` smoke
  test. **Nothing in `backend/main.py` imports or calls any of them** —
  there is no live VSEARCH/Kraken2 execution anywhere. This is a complete,
  tested, disconnected subsystem.

---

## 3. Data layer

| Path | What it is |
|---|---|
| `data/reference/{12S,16S,COI}_database.fasta.gz` | The curated marine-vertebrate reference database (from OceanOmics-AmpliconReference) — the source sequences everything is trained against. |
| `data/reference/*_taxids.txt` | Taxonomy ID lookups paired with each reference FASTA. |
| `scripts/simulate_reads.py` | Fragments the real reference sequences and adds a simple random-substitution error model to produce reads with known ground truth. Replaces the originally-planned `nf-core/readsimulator` (Nextflow) — deliberately simplified for the build timeline, documented honestly in `docs/roadmap.md`. |
| `simulated_data/simulated_reads.fastq` + `manifest.csv` | The actual output of the above: ~200K reads, each with a known true species/marker/accession in the manifest. **Both trained models (A and B) were trained and evaluated on this file.** It also seeds the dashboard's demo sample on every backend startup. |
| `simulated_data/splits.csv` | Train/val/test split assignment per read, duplicate-safe (checked for zero sequence/read-ID overlap between splits per the model READMEs). |
| `simulated_data/demo_upload_sample.fastq` | A smaller pre-built file for manually testing the upload flow without touching the huge full dataset. |
| `simulated_data/endangered_demo.fastq` | **New** — a curated demo file specifically built to trigger real Endangered Species flags in a live presentation. See [§8](#8-the-demo-dataset-guaranteed-endangered-species-flagging). |

### The 500-species vocabulary

Both trained classifiers (A and B) share the same 500-species output space,
defined in `models/transformer/checkpoints/label_mapping.json` (a
`{"0": "Abantennarius coccineus", "1": "Abudefduf abdominalis", ...}` map).
**This is a hard ceiling**: neither model can ever output a species name
outside this list, no matter what real DNA is uploaded. This is the single
fact that explains most of the app's "why didn't X get flagged/found"
questions — see [§8](#8-the-demo-dataset-guaranteed-endangered-species-flagging)
and [§9](#9-known-gaps-stubs-and-honest-limitations).

---

## 4. Backend — file by file

Entry point: `backend/main.py`, a FastAPI app (`FastAPI(title="ANVESH API")`),
run via `uvicorn main:app`. CORS is wide open (`allow_origins=["*"]`) since
there's no cookie-based session auth anywhere — the only credential is a
bearer JWT, which is safe to expose cross-origin.

### `backend/reads_io.py` — file parsing

`parse_reads(filename, fileobj, max_sequences=None) -> list[str]`

- Handles `.fastq`/`.fq`/`.fasta`/`.fa`/`.txt`, optionally `.gz`-compressed,
  detected purely from the filename.
- **Streams the file line-by-line the entire way** — never materializes the
  whole upload in memory. This is a real, hardened fix: an earlier version
  used `await file.read()` first, and a real 135MB non-gzipped reference
  file uploaded during testing OOM-killed the entire Render instance
  (confirmed from Render's own crash log: `Ran out of memory... status 137`)
  before parsing even began.
- `max_sequences` stops parsing (and, for `.gz`, stops *decompression*)
  early once the cap is hit, rather than parsing everything and discarding
  most of it.
- Validates that what it parsed actually looks like DNA: at least 90% of
  characters across all parsed sequences must be valid IUPAC nucleotide
  codes (`ACGTUNRYSWKMBDHV`). If not, it raises `ValueError` rather than
  silently "succeeding" with garbage that would all classify as
  low-confidence noise with no visible error — which would look exactly
  like a broken app instead of a wrong file upload.
- A `.txt` file with no `>` FASTA headers is still parsed correctly — every
  non-empty line becomes its own one-line "sequence."

### `backend/classifier.py` — Artifact A, the live classifier

Already covered in depth in [§2](#2-the-four-modeltool-artifacts--whats-actually-live).
Loaded once at import (module-scope singleton) so the one-time model-load
cost is paid at process startup, not per request.

```python
classify_reads(sequences: list[str]) -> list[{"species": str, "confidence": float}]
```

`confidence` is the model's real `predict_proba` value for its top call —
never a fabricated number.

### `backend/embedding.py` — Artifact B, the live similarity embedder

```python
embed_sequences(sequences: list[str]) -> np.ndarray   # (N, 192)
live_similarity(species: str, sequences: list[str], top_k=8) -> dict | None
```

- Loads Artifact B's checkpoint once at import via
  `DnaSpeciesPredictor()` (from `models/kmer_embedding_classifier/src/inference.py`).
- Also loads the **precomputed reference centroids**
  (`models/kmer_embedding_classifier/similarity_map/embeddings/species_centroid_embeddings.npy`,
  shape `(500, 192)`) — one averaged embedding per training species,
  computed once offline, not recomputed per request.
- `live_similarity()` takes the *real reads this specific sample's
  classifier already called as `species`*, runs a real forward pass to
  embed them, mean-pools into one query vector, L2-normalizes, and computes
  real cosine similarity against all 500 centroids.
- Returns `self_similarity` (how close this sample's own reads land to the
  centroid of the species they were classified as — a live sanity check,
  not a second opinion) and `neighbors` (top-8 *other* species by
  similarity, for the force-graph visualization).

### `backend/similarity.py` — the precomputed reference-only similarity map

Different from `embedding.py` above — this module answers "what is the
*species name* X closest to among the training set," not "what is *this
sample's actual sequence data* closest to." It serves precomputed UMAP
coordinates and nearest-neighbor lists straight from
`models/kmer_embedding_classifier/similarity_map/` with no live computation
at request time — used by `/species/{name}/similarity` (looked up by name
alone, no sample context needed).

### `backend/biodiversity_indices.py` + `species_counts.py`

Real, standard ecology formulas, computed from **actual per-sample species
read counts** (not the fabricated `species_counts.py` import, which is a
leftover local-file loader from a teammate's own machine that safely
degrades to an empty `Counter()` when its two source files aren't present
— see the comment at the top of that file):

```python
richness       = number of distinct species (len(counts))
shannon_index  = -Σ p_i * ln(p_i)             # p_i = species i's share of total reads
evenness       = shannon_index / ln(richness) # 0 if richness <= 1
```

`calculate_all_indices(counts: dict) -> {"richness", "shannon_index", "evenness"}`
is what `main.py` actually calls, always with real per-sample counts from
the classifier's output for that specific sample.

### `data/component_6/conservation_flag.py` + `species_cache.json`

```python
flag_species(scientific_name: str) -> {
    "scientific_name", "common_name", "found_in_cache": bool,
    "iucn_category", "cites_appendix", "wpa_schedule",
    "is_flagged": bool, "flag_reason": str | None
}
```

- Looks the species up (case-insensitive) in `species_cache.json`, a
  manually-researched, hand-curated table — **no live IUCN/CITES API call
  ever happens**, by design, so a demo never depends on external network
  access during judging.
- A species is flagged if **any** of: IUCN category is CR/EN/VU, WPA
  schedule is I or II, or CITES appendix is I. (CITES II alone does *not*
  trigger a flag under the current logic — worth knowing, since several
  cached species are CITES II only.)
- The cache originally had 18 species (whale shark, sea turtles, dugong,
  hammerheads, manta ray, bluefin tuna, etc.) plus 4 explicit "control"
  species that are deliberately Least Concern, to prove the system doesn't
  over-flag everything.
- **The critical fact this file's own new `_meta.demo_additions_2026_08_24`
  note documents**: of those original 18, only **one**
  (*Carcharhinus longimanus*) is actually inside the classifier's 500-species
  vocabulary. The other 17 — including the marquee "whale shark" and "sea
  turtle" demo species — can *never* be predicted by the live classifier at
  all, so they could never really flag in a live demo no matter what was
  uploaded. Three more species were added specifically to close that gap —
  see [§8](#8-the-demo-dataset-guaranteed-endangered-species-flagging).

### `backend/router.py`, `confidence.py`, `pipeline_output.py`

Covered in [§2, Artifact D](#2-the-four-modeltool-artifacts--whats-actually-live).
Real, tested, **not called anywhere in `main.py`**.

### `backend/auth.py` + auth routes in `main.py`

Covered fully in [§6](#6-authentication-github-oauth).

### `backend/main.py` — the FastAPI app itself

**In-memory state**: `SAMPLES: dict[int, dict]` holds every sample
(uploaded sequences, classification status, detections, indices, per-species
read groupings, unmatched/low-confidence reads). This is **not** persisted
to SQLite — `schema.sql`'s `samples`/`detections` tables exist but are
unused by the live code; only the `users` table is real and persisted.
**Consequence**: every uploaded sample is lost on backend restart (Render
free-tier spins down after 15 minutes idle). Sample id `1` is always
re-seeded automatically on startup from a slice of
`simulated_data/simulated_reads.fastq` so the dashboard is never empty on
first load — see `seed_demo_sample()`.

**`init_db()`** (startup event): runs `schema.sql`, then runs three
defensive `ALTER TABLE users ADD COLUMN ...` statements wrapped in
try/except (ignoring "duplicate column" errors) — this is how the GitHub
OAuth columns (`github_id`, `github_username`, `avatar_url`) get added to an
*already-existing* `anvesh.db` file, since SQLite's
`CREATE TABLE IF NOT EXISTS` does not retroactively alter a table that
already exists on disk.

**`_classify_and_aggregate(sequences)`** — the one shared code path used by
*both* a real upload and the startup demo seed (so "seeded" and "real" data
can never silently drift apart):

1. Caps input at `MAX_READS_PER_CLASSIFY = 2000` reads.
2. Calls `classify_reads()` (Artifact A) on all of them.
3. Splits results by `UNMATCHED_CONFIDENCE_THRESHOLD = 0.5`: confident calls
   go into normal per-species counts (and drive biodiversity indices);
   anything below 0.5 confidence is pulled out into a separate "unmatched"
   bucket, grouped by its (rejected) nearest guess, powering the Discovered
   panel — never force-assigned a species name nobody actually believes.
4. For every *confident* species, calls `flag_species()` for conservation
   status and records which raw reads landed in that species (kept so the
   live similarity endpoint can embed this sample's own actual reads later,
   and so a real sequenced read — not a fabricated one — can be shown as the
   species' "barcode").
5. Calls `calculate_all_indices()` on the confident-call counts only.

**Full route table:**

| Method | Path | What it does |
|---|---|---|
| `POST` | `/auth/signup` | Real email/password signup (bcrypt hash, JWT). Not called by the frontend anymore — see [§6](#6-authentication-github-oauth). |
| `POST` | `/auth/login` | Real email/password login. Same status — real, unused by the UI. |
| `GET` | `/auth/github/login` | Redirects to GitHub's OAuth authorize page. |
| `GET` | `/auth/github/callback` | Exchanges the OAuth code, fetches the GitHub profile, creates/updates the user, redirects to the frontend with a token. |
| `GET` | `/auth/me` | Full profile (email/username/avatar) for a bearer token. |
| `POST` | `/samples/upload` | Parses an uploaded file into `SAMPLES[new_id]`, status `"uploaded"`. Accepts an optional bearer token (`get_optional_user`) — attaches the sample to that user if present, otherwise anonymous. |
| `POST` | `/samples/{id}/classify` | Runs `_classify_and_aggregate()` on that sample's stored sequences, status → `"done"`. |
| `GET` | `/samples/mine` | Requires login. Lists the caller's own samples (id/marker/status/reads_used only — no full detection data). |
| `GET` | `/samples/{id}/results` | Species list + confidence + conservation flags. |
| `GET` | `/samples/{id}/discovered` | The low-confidence "unmatched" bucket, grouped by nearest rejected guess. |
| `GET` | `/samples/{id}/reads` | Real raw reads for the sample, grouped by classified species. |
| `GET` | `/samples/{id}/indices` | Biodiversity indices for the sample. |
| `GET` | `/species/{name}/distribution` | **Stub** — hardcoded lat/lon points, carries a `"note"` field saying so. Superseded in practice by the frontend calling GBIF directly — see [§7](#7-frontend--file-by-file). |
| `GET` | `/species/{name}/conservation-status` | Wraps `flag_species()` for a bare species-name lookup. |
| `GET` | `/species/{name}/similarity` | Precomputed reference-graph similarity, by name only (`similarity.py`). |
| `GET` | `/samples/{id}/species/{name}/similarity` | **Live** similarity — embeds this sample's own reads (`embedding.py`). |

---

## 5. The live request lifecycle, end to end

```
 User drops a FASTQ/FASTA file on the Upload card
                    │
                    ▼
     POST /samples/upload  (reads_io.parse_reads, streamed)
     → SAMPLES[new_id] = {status: "uploaded", sequences, ...}
                    │
                    ▼
     POST /samples/{id}/classify
     → _classify_and_aggregate():
         classifier.classify_reads()      [Artifact A — real model]
             │
             ├── confidence ≥ 0.5 ──► counts, reads_by_species
             │                          │
             │                          ├─► conservation_flag.flag_species()  → conservation_flag per species
             │                          └─► biodiversity_indices.calculate_all_indices()
             │
             └── confidence < 0.5 ──► unmatched bucket (Discovered panel)
                    │
                    ▼
     Frontend fires 4 parallel GETs once "done":
       /results  /indices  /reads  /discovered
                    │
                    ▼
     Dashboard renders: SpeciesList, IndexCards, DiscoveredReads
     Auto-scrolls to the results section (UploadSection.tsx)
                    │
     User clicks a species card
                    │
        ┌───────────┴───────────┬─────────────────────────┐
        ▼                       ▼                          ▼
  DnaHelix3D renders    SimilarityMap calls          GeographicMap calls
  using that species'   GET /samples/{id}/species/    GBIF's public API
  own real read as      {name}/similarity             directly (client-side),
  the sequence          [Artifact B — real model,      falling back to the
  (SpeciesList.tsx)      live embedding + cosine        backend's stub only
                         similarity]                    if that fails
```

---

## 6. Authentication (GitHub OAuth)

As of this pass, login is **real GitHub OAuth**, replacing what was
previously a placeholder form (`AuthModal.tsx` had email/password inputs
whose `onSubmit` just closed the modal — no fetch call at all, despite the
backend already having working `/auth/signup`/`/auth/login` routes).

### Backend (`backend/auth.py`)

```python
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET   # from env — no fallback; unconfigured
                                          # login raises a clear 500 rather than
                                          # redirecting to a broken github.com URL
GITHUB_REDIRECT_URI  = "http://127.0.0.1:8000/auth/github/callback"  # must exactly
                                                                       # match what's
                                                                       # registered on GitHub
FRONTEND_URL          = "http://localhost:5173"  # where the callback redirects back to
```

Flow:

1. `GET /auth/github/login` mints a one-time CSRF `state` token
   (`secrets.token_urlsafe(24)`, kept in an in-memory `set`), redirects to
   `https://github.com/login/oauth/authorize?...`.
2. User approves on GitHub. GitHub redirects to
   `GET /auth/github/callback?code=...&state=...`.
3. Backend checks `state` against the in-memory set (rejects replay/tampering),
   exchanges `code` for a GitHub access token
   (`POST https://github.com/login/oauth/access_token`), fetches the profile
   from `GET https://api.github.com/user` (falling back to
   `/user/emails` if the primary email is private), then
   `find_or_create_github_user()` upserts a row in `users` keyed on
   `github_id` (refreshing username/avatar every login).
4. Issues the same JWT (`create_token`) the email/password path already
   used, redirects to `{FRONTEND_URL}/?auth_token={jwt}` — or
   `?auth_error=...` on any failure.

### `users` table changes

`email`/`password_hash` are now **nullable** (a GitHub user has neither
guaranteed); new columns `github_id INTEGER UNIQUE`, `github_username TEXT`,
`avatar_url TEXT`. Existing databases get these via the `init_db()`
migration described in [§4](#4-backend--file-by-file).

### Frontend

- `useAppStore.ts`: `authToken`/`authUser` state, persisted to
  `localStorage` (`anvesh_auth_token`) via `setAuth()`/`logout()`.
- `App.tsx`: on mount, reads `?auth_token=`/`?auth_error=` from the URL
  (cleans it via `history.replaceState` either way), or falls back to a
  token already in `localStorage` from a previous visit — either way calls
  `GET /auth/me` once to hydrate the actual user object (the JWT payload
  itself only carries `user_id`/`email`, not username/avatar).
- `AuthModal.tsx`: now a single "Continue with GitHub" button
  (`<a href={githubLoginUrl()}>`) — a real full-page navigation, not a
  fetch, since the whole point is to leave the SPA and come back.
- `Navbar.tsx`: shows an avatar + username/email pill with a logout button
  when signed in, the old "Login / Signup" button otherwise.
- `UploadSection.tsx`: attaches the bearer token to `/samples/upload` when
  logged in, so `/samples/mine` eventually means something for that user.

**Setup required to actually use this** (not committed, must be done
per-deployment): register an OAuth App at github.com/settings/developers,
set its callback URL to exactly `GITHUB_REDIRECT_URI`, and put
`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` in `backend/.env` (gitignored) or
real deploy env vars.

---

## 7. Frontend — file by file

Vite + React + TypeScript + Tailwind + Zustand. Dev server proxies `/api/*`
to `127.0.0.1:8000` (`vite.config.ts`); production build uses
`VITE_API_BASE_URL` as a full absolute URL instead (no proxy in a static
build).

### State (`store/useAppStore.ts`)

One flat Zustand store, no slices/middleware. Holds: hero-scroll state,
current sample's `detections`/`indices`/`readsBySpecies`, the `discovered`
(unmatched) list, `selectedSpecies`, map focus/sample-location, every
modal's open/closed state, and the auth session (`authToken`/`authUser`).

### API layer (`api/client.ts` + `types.ts`)

Every backend route above has a matching typed function here. One shared
`request<T>()` helper does the fetch, and on a non-OK response tries to
surface the backend's real `{"detail": "..."}` message rather than a bare
status code.

### Bootstrap (`App.tsx`)

Two effects on mount: (1) fetches the seeded demo sample (id 1) so the
dashboard isn't empty before any upload; (2) the auth-session pickup
described in [§6](#6-authentication-github-oauth). Renders, top to bottom:
`Navbar` → `ScrollVideoHero` → `LoopVideoSection` (contains `UploadSection`)
→ the main dashboard column (`SpeciesList`, `GeographicMap`,
`DiscoveredReads`, `IndexCards`, `SimilarityMap`) → `Credits` → every modal.

### Hero & upload

- `ScrollVideoHero.tsx`: full-bleed forward/reverse video pair, seamlessly
  swapped depending on scroll direction (an `IntersectionObserver` on the
  hero section drives `setHeroDone`, which the fixed `Navbar` uses to fade
  itself in only once the hero is scrolled past).
- `LoopVideoSection.tsx`: a sticky looping background video with the
  "Upload a sample" content scrolled over it. Also hosts the ambient
  `DeepSeaCreature` (the floating turtle) — deliberately relocated here
  (from the main dashboard body) specifically so it visibly swims past the
  upload card.
- `UploadSection.tsx`: drag-drop or click-to-browse file input, marker-gene
  picker (12S/16S/COI), calls `uploadSample` → `classifySample` → the four
  parallel result fetches, then **auto-scrolls to the species section**
  150ms after `"done"` (a plain `setTimeout`, not `requestAnimationFrame` —
  see the inline comment; a same-frame rAF call had no visible effect
  because `selectSpecies()` right before it synchronously mounts a whole
  Three.js WebGL scene for the 3D DNA helix panel, which was enough
  in-flight main-thread work to swallow it).

### Dashboard components

- **`SpeciesList.tsx`** — the main results table. Each row: species name,
  read count, common name, confidence bar, conservation badge; expands
  in-place to show IUCN status / BLAST-style confidence / legal schedule /
  export buttons. Clicking a card also opens a sticky right-hand
  "Holographic 3D DNA Studio" panel (`DnaHelix3D.tsx`) rendering that
  species' *real* sequenced read (or a deterministic synthetic fallback —
  see `lib/bioinformatics.ts`) as an interactive rotating double helix.
  **Paginated**: shows the first 10 detections by default, with a
  "Show N more / Show fewer" toggle below the list — export actions always
  operate on the full list regardless of what's currently visible.
- **`DnaHelix3D.tsx`** — a real Three.js scene (not a static image):
  base-pair geometry generated from the actual sequence string, camera/HUD
  tuned to fit the panel, raycasting for a per-base-pair hover tooltip,
  drag-to-rotate/scroll-to-zoom. Renders at `z-30`, deliberately above the
  dashboard's translucent glass panels — the same reason the floating
  turtle needed a z-index bump (see [§9](#9-known-gaps-stubs-and-honest-limitations)).
- **`GeographicMap.tsx`** — Leaflet map, dark CartoDB tiles. On selecting a
  species, tries a **live client-side call to the real public GBIF API**
  first (`api.gbif.org/v1/occurrence/search`); only falls back to the
  backend's `/species/{name}/distribution` stub if that fails or returns
  nothing. (Worth flagging: this is more "live" than the backend README
  currently describes — the frontend bypasses the backend stub for this
  particular feature.)
- **`DiscoveredReads.tsx`** — the low-confidence/unmatched bucket, grouped
  by nearest rejected species guess. A single "Locate sample on map" action
  (not per-row) is deliberate: eDNA reads don't carry individual GPS
  coordinates, only the whole sample has one real collection point — a
  per-row locate button would dishonestly imply otherwise. **Paginated**
  the same way as `SpeciesList` (10 by default, "Show N more/fewer").
- **`IndexCards.tsx`** — three gauge cards (richness/Shannon/evenness)
  driven directly by the backend's real computed indices.
- **`SimilarityMap.tsx`** — D3 force-directed graph. Fetches
  `getLiveSimilarity(sampleId, selectedSpecies)` (Artifact B, real
  embedding) whenever the selected species changes; renders the queried
  species as a highlighted center node connected to its real nearest
  neighbors, edge length inversely tied to real cosine similarity. Includes
  label-collision clamping so long species names don't run off the panel.

### Modals

- **`AuthModal.tsx`** — GitHub sign-in, see [§6](#6-authentication-github-oauth).
- **`EndangeredModal.tsx`** — a right-side drawer listing every *currently
  detected* species whose `conservation_flag` is non-null, filtered against
  a real threatened-status keyword set. Genuinely reads from the live
  `detections` store, not mock content — it will only ever show something
  if the backend actually flagged a real detection (see
  [§8](#8-the-demo-dataset-guaranteed-endangered-species-flagging) for why
  that was rare before this pass).
- **`IucnDrawer.tsx`** — the shared IUCN Red List category legend
  (`lib/iucn.ts`), opened from any conservation badge.
- **`ScientificModal.tsx`** — the "Full Datasheet" deep-dive for one species.

### Decorative layer

`RisingBubbles`, `JellyfishLayer`, `DeepSeaCreature` (the turtle),
`OceanFloor`, `Shipwreck`, `FloatingCreatures` (currently commented out in
`App.tsx`) — all `aria-hidden`, `pointer-events-none` ambient animation,
CSS-keyframe driven (`index.css`'s `roam-right`/`swim-*` families), with a
`prefers-reduced-motion` off-switch. Notably: every one of these renders at
`z-0` **except** `DeepSeaCreature`, which was bumped to `z-30` — at `z-0` it
sat behind the dashboard's `.glass` panels, and two stacked 22px
backdrop-blurs were enough to fully erase a small image rather than just
soften it.

### Known frontend bugs (still present, out of scope for this doc's edits)

- `id="assessment"` is used by two different sections (`SpeciesList.tsx`
  and `IndexCards.tsx`) — a duplicate DOM id.
- `ConservationBadge` renders a `<button>`, and it's used inside
  `SpeciesList`'s own outer `<button>` — invalid nested-button HTML
  (harmless visually, flagged by React's `validateDOMNesting` warning).

---

## 8. The demo dataset (guaranteed endangered-species flagging)

### The problem

Cross-referencing the classifier's 500-species vocabulary
(`label_mapping.json`) against the original 18-species conservation cache
(`species_cache.json`) turns up **exactly one overlap**:
*Carcharhinus longimanus* (Oceanic whitetip shark, IUCN CR). Every other
cached species — whale shark, green/hawksbill/loggerhead turtles, dugong,
hammerheads, manta ray — is real data, but **cannot ever be predicted by
the live model**, so a random real upload essentially never triggers the
Endangered Species panel. This was verified end-to-end before any fix: a
real training read for *C. longimanus* was run through the actual live
`classify_reads()` → `flag_species()` path and correctly came back
99.1% confidence / `IUCN CR`, proving the mechanism works — it just had
almost nothing to fire on.

### The fix

Two changes, both real (no fabricated data):

1. **`data/component_6/species_cache.json`** gained three more entries —
   *Somniosus microcephalus* (Greenland shark, VU), *Hippocampus whitei*
   (White's seahorse, EN), *Urogymnus asperrimus* (Porcupine ray, VU) —
   each confirmed to actually be in the classifier's 500-species
   vocabulary. Their IUCN categories were filled in from general knowledge
   rather than a fresh redlist.org lookup (unlike the original 18, which
   cite `last_manually_verified: 2026-08-22`) — **spot-check the exact
   category on redlist.org before citing it in a judged presentation**;
   this is stated directly in the file's own `_meta` block.
2. **`scripts/make_demo_dataset.py`** — a new, rerunnable script that pulls
   **real reads** (not synthetic/fabricated ones) for those 4 flaggable
   species plus 4 ordinary control species, straight from the existing
   `simulated_data/simulated_reads.fastq` / `manifest.csv` (the same real
   data both models were trained on), 15 reads each, into
   `simulated_data/endangered_demo.fastq` (120 reads total — small enough
   to upload and classify in seconds live).

### Verified result

Uploading `endangered_demo.fastq` through the real `/samples/upload` →
`/samples/{id}/classify` → `/samples/{id}/results` path produced exactly
this (captured directly from a live run, not hand-written):

```json
{
  "detections": [
    { "species": "Carcharhinus longimanus", "confidence": 0.992, "conservation_flag": "IUCN CR" },
    { "species": "Somniosus microcephalus",  "confidence": 0.891, "conservation_flag": "IUCN VU" },
    { "species": "Hippocampus whitei",        "confidence": 0.954, "conservation_flag": "IUCN EN" },
    { "species": "Urogymnus asperrimus",      "confidence": 0.980, "conservation_flag": "IUCN VU" },
    { "species": "Amphiprion akindynos",      "confidence": 0.922, "conservation_flag": null },
    { "species": "Acanthurus nigricauda",     "confidence": 0.952, "conservation_flag": null },
    { "species": "Anguilla reinhardtii",      "confidence": 0.918, "conservation_flag": null },
    { "species": "Apogon imberbis",           "confidence": 0.928, "conservation_flag": null }
  ]
}
```

Four real, correctly-classified, correctly-flagged endangered species; four
correctly-*unflagged* controls for contrast, so the demo doesn't look like
"everything is endangered." Uploading this file live will populate the
Endangered Species drawer for real, with real confidence numbers.

### To regenerate or extend it

```bash
python scripts/make_demo_dataset.py
```

Edit the `ENDANGERED_SPECIES` / `CONTROL_SPECIES` lists at the top of the
script (any species must be in `label_mapping.json` to ever be classified,
and in `species_cache.json` with a triggering IUCN/WPA/CITES value to
actually flag).

---

## 9. Known gaps, stubs, and honest limitations

Carried forward from `README.md`'s own checklist, cross-checked against the
current code:

- [x] Real classifier live (upload → classify → results/indices)
- [x] Real conservation flagging, real biodiversity indices
- [x] Real genetic similarity map (precomputed + live embedding)
- [x] Real GitHub OAuth (this pass)
- [ ] BarcodeBERT / custom DL classifier (Artifact C) — architecture exists, never trained
- [ ] Two classifiers doing overlapping jobs (A live for classification, B live only for its embeddings) — worth eventually unifying
- [ ] VSEARCH/Kraken2 ensemble router (Artifact D) — real and tested, not wired into live endpoints
- [ ] Conservation cache now covers 21 of 500 possible species (was 18) — still most detected species won't be in it
- [ ] `/species/{name}/distribution` backend route is still a hardcoded stub — in practice masked by the frontend's live GBIF client-side call, but the backend fallback itself remains fake
- [ ] Real sample collection coordinates — upload never captures them; the map's "this sample" marker is a hardcoded/randomized-on-upload location, not a real GPS reading
- [ ] Persistence — `SAMPLES` is in-memory only, lost on backend restart; only the `users` table is durable
- [ ] Automated tests — none beyond ad hoc `__main__` smoke-checks in individual modules
- [ ] Quantum-autoencoder novelty detection (`quantum_research/`) — research notebook only, never a wired feature
- [ ] Duplicate `id="assessment"` and the nested-`<button>` conservation badge — known, harmless, unfixed frontend bugs

---

## 10. Deployment & environment variables

**Backend (Render)** — `render.yaml` Blueprint, root dir `backend/`,
`uvicorn main:app --host 0.0.0.0 --port $PORT`. Free tier sleeps after 15
minutes idle (~30s cold-start on the next request).

**Frontend (Vercel)** — root directory `frontend`, framework auto-detected
as Vite, default build command/output dir.

| Variable | Where | Purpose | Required? |
|---|---|---|---|
| `AQUAVIGIL_SECRET_KEY` | Backend | JWT signing key. Without it, a random key is generated per process start (all existing sessions invalidate on every restart). | Recommended in prod |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Backend | GitHub OAuth App credentials. Without these, `/auth/github/login` returns a clear 500 instead of a broken redirect. | Required for login to work at all |
| `GITHUB_REDIRECT_URI` | Backend | Must exactly match the callback URL registered on the GitHub OAuth App. Defaults to `http://127.0.0.1:8000/auth/github/callback`. | Required in prod (GitHub allows only one callback URL per OAuth App — a second app is needed for a second environment) |
| `FRONTEND_URL` | Backend | Where the OAuth callback redirects back to after login/error. Defaults to `http://localhost:5173`. | Required in prod |
| `VITE_API_BASE_URL` | Frontend (Vercel) | Full absolute URL of the deployed backend — there's no dev proxy in a static production build. | Required in prod |

Local dev convenience: `backend/.env` is loaded automatically via
`python-dotenv` if present (gitignored) — no need to export real shell env
vars for local testing.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Marker gene** | A specific short region of DNA (12S, 16S, or COI) used as a species-identifying "barcode" — different genes suit different taxa/read lengths. |
| **eDNA** | Environmental DNA — genetic material shed into water/soil by organisms, sequenced without capturing the organism itself. |
| **k-mer** | A substring of length *k* taken from a longer sequence (e.g. all overlapping 5-character windows) — a classical way to turn variable-length DNA into fixed-size numeric features. |
| **TF-IDF** | Term Frequency–Inverse Document Frequency — a classical NLP feature-weighting technique, here applied to DNA k-mers instead of words. |
| **Closed-set classifier** | A model that can only ever output one of a fixed, predetermined set of classes (here, exactly 500 species) — it has no way to say "none of the above." |
| **Embedding** | A fixed-length numeric vector representing a piece of data (here, a DNA sequence) such that similar inputs land close together in that vector space. |
| **Cosine similarity** | A measure of how similar two vectors' *directions* are (1 = identical direction, 0 = unrelated, -1 = opposite) — used here to compare embeddings regardless of their magnitude. |
| **UMAP** | A dimensionality-reduction technique used to lay high-dimensional embeddings out on a 2D map for visualization, preserving relative closeness. |
| **IUCN Red List category** | The global standard extinction-risk classification (LC → NT → VU → EN → CR → EW → EX), from Least Concern to Extinct. |
| **CITES Appendix** | International trade-restriction tiers for species (I = most restricted, trade essentially banned; II = regulated but not banned). |
| **WPA Schedule** | India's Wildlife Protection Act (1972) legal protection tiers, independent of but often aligned with IUCN status. |
| **JWT** | JSON Web Token — a signed, self-contained credential; this app's `create_token()`/`decode_token()` in `auth.py`. |
| **Marker-gene ensemble** | The (unwired) Artifact D idea of running multiple classical tools per marker gene and combining their answers rather than trusting one model alone. |
