# ANVESH

An end-to-end environmental DNA (eDNA) pipeline for marine species
identification. Upload raw sequencing reads, get species calls with real
confidence scores, conservation-status flags, biodiversity indices, and an
interactive genetic similarity map — in one pass, on commodity hardware, with
no bioinformatics setup.

Built as a student project. The interesting output turned out to be less the
accuracy numbers than the **deployment failure modes** we measured along the
way — see [the paper](docs/paper/anvesh-ieee.tex) and
[Findings](#findings-what-we-actually-learned).

---

## What it does

```
FASTQ/FASTA  →  classify  →  verify  →  assess  →  flag  →  dashboard
   upload       500 spp     192-D      Shannon    IUCN /
                + conf.     embedding  richness   CITES /
                            cosine     evenness   WPA
```

1. **Ingest** — streamed FASTA/FASTQ(.gz) parsing, validated as real DNA
   before anything else runs.
2. **Classify** — 5-mer TF-IDF + logistic regression over 500 marine species,
   98.66% test accuracy. Each read is classified in **both strand
   orientations** and the more confident call wins (see
   [Findings](#findings-what-we-actually-learned) — this matters a lot).
3. **Verify** — an independently trained 192-D embedding model (98.85% test
   accuracy) embeds the sample's own reads and computes real cosine
   similarity against per-species reference centroids.
4. **Assess** — Shannon index, species richness, and Pielou evenness computed
   from actual per-species read counts.
5. **Flag** — each species is checked against a cached IUCN / CITES / Indian
   Wildlife Protection Act table. No live API call, so it can't fail offline.

Reads below a 0.5 confidence threshold are pulled out of the results and the
biodiversity math entirely, and surfaced separately as **Discovered** —
grouped by nearest rejected match, with embedding-space neighbours. A
closed-set classifier can't say "I don't know", so this is where that honesty
gets restored.

## Findings (what we actually learned)

Three things that a held-out accuracy number does not tell you:

**Strand orientation collapse.** Read simulators fragment only the forward
strand, so the model never sees reverse-complement k-mer profiles. Measured
on 5,000 held-out reads:

| Condition | Accuracy | Mean confidence |
|---|---|---|
| Forward strand | 98.78% | 90.94% |
| Reverse strand | **0.38%** | 26.58% |
| Dual-orientation | 97.58% | 91.21% |

Dual-orientation inference recovers 97.59% of otherwise-lost reads with no
retraining, costing 1.2 points on known-forward reads.

**Coverage cascade.** The reference database holds 13,351 species. The model
is trained on 500 of them (3.7%). The conservation table intersects just 4 of
those 500 (0.8%). The flagging feature is individually correct and jointly
almost inert — well-known targets like whale shark and several sea turtles
sit in the conservation table but outside the model's vocabulary, so they can
never be reported at all.

**Closed-set overconfidence.** 99.62% of wrong-strand reads still receive a
confident species label. The confidence gate intercepts ~89.5% of them; the
rest leak through as confident errors.

## Repo layout

| Path | What's there |
|---|---|
| `backend/main.py` | FastAPI app — upload, classify, results, indices, discovered, similarity, GitHub OAuth |
| `backend/classifier.py` | The live classifier (5-mer TF-IDF + LogReg), incl. dual-strand inference |
| `backend/embedding.py` | Live similarity — embeds this sample's reads, cosine vs. reference centroids |
| `backend/similarity.py` | Precomputed reference similarity map (UMAP coords + neighbours) |
| `backend/biodiversity_indices.py` | Shannon / richness / evenness |
| `backend/auth.py` | GitHub OAuth + JWT |
| `backend/reads_io.py` | Streamed FASTA/FASTQ(.gz) parser with DNA validation |
| `data/component_6/` | Conservation flagging + the cached IUCN/CITES/WPA table (21 species) |
| `data/reference/` | Curated 12S/16S/COI marine vertebrate reference DB |
| `models/transformer/` | The live classifier's checkpoint, **plus** an untrained BarcodeBERT + BiLSTM + attention architecture |
| `models/kmer_embedding_classifier/` | The 192-D embedding model (`kmer_mean_mlp`) |
| `scripts/simulate_reads.py` | Read simulator — fragments the reference DB, adds substitution error |
| `scripts/make_demo_dataset.py` | Builds a curated demo FASTQ that reliably triggers real conservation flags |
| `frontend/` | React + Vite dashboard — species list, 3D DNA helix, similarity graph, GBIF map |
| `docs/` | Architecture, full pipeline walkthrough, and the IEEE paper |

## Running it

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

`http://127.0.0.1:8000/docs` for the interactive API. On startup it seeds
sample `1` by classifying a real slice of the simulated dataset, so there's
real data immediately without uploading anything.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173`. Proxies `/api/*` to the backend on `:8000` in dev.

**GitHub login (optional)** — copy `backend/.env.example` to `backend/.env`
and fill in credentials from a [GitHub OAuth
App](https://github.com/settings/developers). The app works fine without it;
you just can't sign in, and samples aren't tied to an account.

**Try the conservation flagging** — upload
`simulated_data/endangered_demo.fastq`. It contains real reads for four
IUCN-threatened species that the model can actually identify, plus four
unflagged controls.

## Deployment

Frontend on Vercel (root directory `frontend`, Vite preset, set
`VITE_API_BASE_URL` to the backend URL). Backend on Render via the
`render.yaml` blueprint. Both CPU-only — PyTorch is pinned to the CPU wheel
deliberately, since the CUDA build doesn't fit a free-tier image.

CORS is fully open, which is safe here because the only credential is a
bearer JWT — no cookies or sessions anywhere.

## Status — what's real and what isn't

**Working end to end:** classification, dual-strand robustness, conservation
flagging, biodiversity indices, live embedding similarity, the Discovered
panel, GitHub OAuth, the 3D DNA helix viewer, FASTA/JSON/CSV export.

**Known gaps, stated plainly:**

- [ ] **Never validated on real sequencing data** — everything here is trained
      and evaluated on simulated reads. No indels, no platform error profile,
      no PCR bias, no chimeras. This is the biggest caveat in the project.
- [ ] **BarcodeBERT branch is untrained** — the architecture is real and runs,
      but only a 1-epoch stability check was ever executed. No checkpoint.
- [ ] **VSEARCH/Kraken2 ensemble is not wired in** — implemented and unit-checked
      (`backend/router.py`, `confidence.py`, `pipeline_output.py`), never
      integrated into the serving path.
- [ ] **Conservation coverage** — 21 species cached, only 4 of which the model
      can actually emit.
- [ ] **Samples are in-memory** — lost on backend restart. Only user accounts
      persist (SQLite). This also means the backend can't scale horizontally
      as-is.
- [ ] **Backend `/species/{name}/distribution` is still a stub** — the frontend
      bypasses it and queries the GBIF API directly, so the map is live, but
      the backend route itself returns placeholder points.
- [ ] **Sample coordinates aren't captured** on upload — the map's sample
      marker is synthesised.
- [ ] **Taxonomy/habitat detail panel** falls back to generic placeholder
      values for any species outside a small hardcoded lookup.
- [ ] **No automated tests** beyond `__main__` smoke checks in individual modules.
- [ ] **Quantum novelty detection** — a research notebook only
      (`quantum_research/`), abandoned after circuit noise dominated the
      signal at available qubit counts.

Where a route returns placeholder data, its JSON response carries a `note`
field saying so — worth keeping that convention.

## Paper

`docs/paper/anvesh-ieee.tex` — IEEE-format write-up of the benchmark and the
three findings above, including the negative results. Self-contained; paste
into Overleaf.

## Contributors

[Shriyans Bharuka](https://www.linkedin.com/in/shriyans-bharuka/ ) · [Aarya Burande](https://www.linkedin.com/in/aarya-burande-1011a0397/ ) · [Darshan Mahale](https://www.linkedin.com/in/darshan-mahale-77123a311/ ) · [Aarav Nambiar](https://www.linkedin.com/in/aarav-nambiar-a017ab348/ ) ·
[Sunanda Pandit](https://www.linkedin.com/in/sunanda-pandit-288816302/ ) · [Leena Madavi](https://www.linkedin.com/in/leena-madavi/ )


## License

Source code is MIT licensed — see [`LICENSE`](LICENSE).

The MIT license covers the code only. Reference sequence data, trained model
checkpoints, and image/video assets carry separate upstream terms and
attribution requirements — see
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) before redistributing.
