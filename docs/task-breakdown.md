# AquaVigil — Detailed Build Breakdown

### Every component, what it actually takes to build, and who could own it

> Technical terms are explained in **[brackets]** the first time they appear, as before. This document assumes you've already seen the architecture diagram — it goes one level deeper into each box: concrete tasks, tools, and required skills, so the team can actually split the work.

---

## How to use this

Each section below is one "box" from the architecture diagram, broken into:
- **What it does** (one line)
- **Concrete tasks** (a checklist — literally what someone sits down and does)
- **Tools/libraries required**
- **Skills needed**
- **Suggested owner type**

At the end there's a proposed task-to-person split across your 6 team members.

---

## 1. Data Layer

**What it does:** Supplies the curated reference DNA database and simulated training/test data everything else depends on.

**Tasks:**
- [ ] Clone the OceanOmics-AmpliconReference repository, extract the marker-gene FASTA files [DNA sequence files] you'll actually use.
- [x] Run `scripts/simulate_reads.py` to generate simulated eDNA reads with known correct answers — replaces the originally-planned `nf-core/readsimulator` (Nextflow), which was evaluated and skipped for this build's timeline.
- [ ] Decide the dataset's scope — how many species, which of the 3 marker genes — this is a decision point, not just a task (see the earlier dataset discussion).
- [ ] Write a small script converting the reference + simulated data into whatever format the Classification Engine expects (a clean, labeled training set).

**Tools/libraries required:** Python, git. (No longer Nextflow/Docker/Singularity — see the note above.)

**Skills needed:** Comfortable with the command line; no deep bioinformatics background required — mostly following documented setup steps.

**Suggested owner:** Shriyans — this blocks everyone else, so it should start first regardless.

---

## 2. Classification Engine — Ensemble Router

**What it does:** Runs 2–3 existing classical [already-built, not custom-made] DNA classifier tools and decides which one's answer to trust for each gene marker.

**Tasks:**
- [ ] Pick and containerize [package with Docker so it runs identically everywhere] 2–3 classical tools — e.g. one alignment-based tool, one k-mer-based tool.
- [ ] Write the routing logic: a simple lookup table (gene marker → which tool to trust most), based on the research paper's findings.
- [ ] Build consensus voting [combining multiple tools' answers into one final call plus an agreement score].
- [ ] Test it against the sample dataset already provided.

**Tools/libraries required:** Docker, the chosen classifier tools (e.g. VSEARCH, Kraken2), Python for the glue logic.

**Skills needed:** Comfortable installing and running command-line bioinformatics tools; basic Python.

**Suggested owner:** Sunanda, working closely with Shriyans.

---

## 3. Classification Engine — BarcodeBERT + Custom DL Head

**What it does:** Loads the pretrained BarcodeBERT Transformer, extracts embeddings [numerical fingerprints of a DNA sequence], and trains your own classification layer on top.

**Tasks:**
- [ ] Set up a Python 3.11 or 3.12 environment with `transformers` and PyTorch [the two main libraries needed to load and run the model].
- [ ] Load BarcodeBERT, confirm it produces an embedding for a test sequence (the "does it even work" milestone).
- [ ] Build the custom head: self-attention layer → BiLSTM → classification layer.
- [ ] Train the head on your labeled marine-vertebrate data from the Data Layer.
- [ ] Evaluate accuracy on held-out [set aside and not used for training, so it's a fair test] data.
- [ ] Stretch goal: fine-tune BarcodeBERT's own weights, not just the custom head.

**Tools/libraries required:** PyTorch, HuggingFace `transformers` library, a GPU is very helpful (Google Colab's free tier is a reasonable fallback if nobody has local GPU access).

**Skills needed:** Machine learning / deep learning experience, solid Python. This is the most technically demanding piece.

**Suggested owner:** Darshan and Aarya, paired — worth two people here given both the difficulty and the importance to your pitch's novelty story.

---

## 4. Confidence Layer

**What it does:** Combines classifier agreement and reference-database coverage into one confidence score per detection.

**Tasks:**
- [ ] Define the actual scoring formula — keep it simple and explainable (a weighted combination is enough).
- [ ] Implement it as a backend function: classifier outputs in, confidence score out.
- [ ] Test it on a case where classifiers agree and a case where they disagree, confirm the score behaves sensibly.

**Tools/libraries required:** Python, whatever backend framework you pick (e.g. FastAPI).

**Skills needed:** Backend/Python — genuinely small, self-contained piece.

**Suggested owner:** Sunanda — folded into her component 2 work, since this is the glue right after it, not a full-time task on its own.

---

## 5. Biodiversity Indices Engine

**What it does:** Computes the Shannon diversity index, species richness, and evenness from per-species read counts.

**Tasks:**
- [ ] Implement the three formulas in Python (or use the `scikit-bio` library, which has them built in).
- [ ] Wire it to take a sample's species + read-count data as input, output the three numbers.
- [ ] Test it against one hand-calculated example so you're confident the math is right.

**Tools/libraries required:** Python, optionally `scikit-bio`.

**Skills needed:** Basic Python, comfort implementing a formula from a written spec — genuinely one of the more approachable tasks in this whole project.

**Suggested owner:** Sunanda — fits naturally alongside her other backend work, and it's fully self-contained with a clear, testable spec if she wants to hand it off when busy.

---

## 6. Conservation Flagging

**What it does:** Checks detected species against IUCN Red List and Wildlife Protection Act data, flags anything endangered/protected.

**Tasks:**
- [ ] Register for IUCN Red List API access (do this early — registration can take some lead time).
- [ ] Manually compile a small lookup table of Wildlife Protection Act schedules for your demo species set — no clean public API exists for this part, it's genuine research work.
- [ ] Build the lookup/flagging logic.
- [ ] Cache all results locally ahead of time so the demo never depends on a live external API call.

**Tools/libraries required:** IUCN API, basic backend/Python.

**Skills needed:** Half research work (compiling the Wildlife Act table), half basic backend wiring — a good task to split across two people.

**Suggested owner:** Aarav on the domain research (the lookup table), Sunanda wiring the API + caching.

---

## 7. Similarity Map (genetic)

**What it does:** Shows an unidentified sequence's genetic closeness to known species as a visual node map, using BarcodeBERT's embeddings.

**Tasks:**
- [ ] Reuse the embeddings already computed for reference species in component 3 — no need to recompute.
- [ ] Implement 2D projection [flattening high-dimensional embeddings down to a 2D layout] using UMAP or t-SNE.
- [ ] Build the frontend graph/network visualization (nodes + connecting edges).
- [ ] Wire it up so clicking an uncertain detection opens this view.

**Tools/libraries required:** `umap-learn` or `scikit-learn` (Python, for the projection math), a graph-drawing library on the frontend (e.g. D3.js).

**Skills needed:** Some data visualization experience plus frontend work.

**Suggested owner:** Aarya for the projection logic, Leena for the frontend rendering — they need each other's output directly, so plan for close back-and-forth here.

---

## 8. Geographic Map (GBIF)

**What it does:** Click a species, see a world map of where it's historically been recorded.

**Tasks:**
- [ ] Build a backend endpoint [a URL your frontend can request data from] that calls the GBIF occurrence API and caches the results.
- [ ] Frontend: integrate Leaflet.js with a marker-clustering plugin.
- [ ] Handle showing the current sample's location as a separately highlighted marker.
- [ ] Add the honesty caption noting this reflects recorded sightings, not confirmed full range.

**Tools/libraries required:** Leaflet.js, Leaflet.markercluster, the GBIF API.

**Skills needed:** Frontend work, plus a little backend for the caching layer.

**Suggested owner:** Leena — pairs naturally with component 9 (the dashboard).

---

## 9. Dashboard (umbrella UI)

**What it does:** The main screen — species list, confidence indicators, index cards, conservation flags, and links into both maps.

**Tasks:**
- [ ] Wireframe the layout on paper first, before writing any code.
- [ ] Build the species list view with confidence + conservation-flag styling.
- [ ] Build the biodiversity index cards.
- [ ] Wire up click-throughs to both the similarity map and the geographic map.
- [ ] Connect everything to the backend API.

**Tools/libraries required:** React (or your team's preferred frontend framework), Tailwind CSS, Recharts for any charts.

**Skills needed:** Frontend/React.

**Suggested owner:** Leena — realistically oversees components 7, 8, and 9 together since they share the same skill set and codebase.

---

## 10. Shared / infrastructure tasks (not owned by any one component)

**Tasks:**
- [ ] Repo setup and branching strategy.
- [ ] Database schema implementation — the `samples`, `detections`, `species_cache`, and `conservation_status` tables from the architecture doc.
- [ ] API scaffolding — set up the actual endpoints (`/samples/upload`, `/samples/{id}/results`, etc.) as empty routes early, so every component owner has something real to plug into.
- [ ] Docker Compose so the entire system launches with one command.
- [ ] Demo data prep — pre-cache all external API responses (IUCN, GBIF) for your demo species ahead of time, so nothing depends on a live call during judging.

**Suggested owner:** Shriyans — ties in naturally with his Data Layer + integration role, since this touches every other component.

---

## Suggested split across your 6 people (updated for actual skills)

Leena (frontend), Sunanda (backend), Darshan (DL/RL), Aarya (Transformers/GNNs), Aarav (quantum models/research), and you, Shriyans (full-stack: Python, React, FastAPI, MongoDB).

| Person | Owns | Why |
|---|---|---|
| **Leena (frontend specialist)** | Components 7, 8, 9 (Similarity map UI, Geographic map, Dashboard) | All three are the same skill set and codebase — one clear owner for the entire visual layer |
| **Sunanda (backend specialist)** | Components 2, 4, 6 (backend half), plus shares component 10 (infra) | Ensemble routing, confidence scoring, and the conservation API are all backend/Python glue work |
| **Darshan (DL/RL)** | Component 3 (BarcodeBERT + custom head) — primary owner | Direct match: this is deep learning end to end |
| **Aarya (Transformers/GNNs)** | Pairs on component 3, and upgrades component 7 | Transformers → BarcodeBERT is a direct match. GNNs [Graph Neural Networks — models that learn over networks of connected nodes] are a genuine upgrade path for the similarity map: instead of just projecting embeddings with UMAP and drawing a static graph, a GNN could actually learn over the species-relationship graph itself, potentially producing a richer, more accurate "closest relatives" view. Worth having them own this specifically — it plays to their exact specialty rather than being a generic frontend task |
| **Shriyans** | Component 1 (Data Layer) + component 10 (infra/integration) | These are the two things that block everyone else and need someone with the full-stack view of how all the pieces connect — matches your own background and the role you've already been playing across these planning conversations |

### On Aarav's quantum models/research skill — an honest note

There isn't a natural fit for quantum computing anywhere in this architecture as currently scoped, and I'd rather say that plainly than invent a contrived "quantum layer" that doesn't actually do anything — that kind of forced inclusion tends to read as a buzzword to anyone evaluating the project closely, which undermines credibility rather than adding to it.

What I'd suggest instead: lean on the **research** half of that skill set, which genuinely is useful here —
- Own the domain-research parts of component 6 (compiling the Wildlife Act lookup table, IUCN research) and any literature-review support the DL pair needs.
- Own writing the technical narrative/pitch documentation, since that needs someone who can hold the whole system's reasoning in their head.
- If the team still wants a quantum thread in the pitch for breadth, position it honestly as a **named future-research direction** ("we investigated whether quantum-inspired optimization could improve ensemble consensus, and see it as a promising next step") rather than a built feature. That's an honest, still-technically-interesting line — not an overclaim you'd have to defend under questioning.

### Two real blockers, unchanged

Components 1 (Data Layer) and 3 (BarcodeBERT + custom head) are still the pieces everything else depends on — nothing else can be properly tested with real data until those two are producing real output. Start those first regardless of who's assigned where.
