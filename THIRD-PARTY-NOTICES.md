# Third-Party Notices

The MIT license in `LICENSE` applies to the source code in this repository.
It does **not** apply to the items below, which are redistributed under their
own terms.

---

## Reference sequence data

`data/reference/{12S,16S,COI}_database.fasta.gz` and the accompanying
`*_taxids.txt` files are derived from the **OceanOmics AmpliconReference**
database:

- https://github.com/MinderooFoundation/OceanOmics-AmpliconReference

**Action required before relying on this repo commercially:** confirm the
upstream license terms of that database and reproduce them here. We have not
independently verified them.

## Trained model checkpoints

`models/transformer/checkpoints/` and
`models/kmer_embedding_classifier/checkpoints/` contain models trained on
reads simulated from the reference data above. Derived models may inherit
the upstream data license. Treat them under the same terms as the reference
data until confirmed otherwise.

## Pretrained transformer (referenced, not redistributed)

`models/transformer/model.py` loads `bioscan-ml/BarcodeBERT` from Hugging Face
at runtime. No weights for it are stored in this repository. Its license is
whatever the model card on Hugging Face states.

## Marine imagery — Wikimedia Commons

Used under the licenses listed. Attribution is also rendered in-app
(`frontend/src/components/layout/Credits.tsx`).

| Subject | Author | License |
|---|---|---|
| Clownfish | Janderk | Public domain |
| Green sea turtle | Ppmh21 | CC BY-SA 4.0 |
| Blue tang | Tewy | CC BY-SA 3.0 |
| Whale shark | istolethetv | CC BY 2.0 |
| Caribbean reef shark | Dennis Hipp | CC0 |
| Manta ray | Tchami | CC BY-SA 2.0 |
| Jellyfish | Hans Hillewaert | CC BY-SA 4.0 |
| Giannis D wreck | W. Strickling | CC BY-SA 4.0 |

Source URLs are in `Credits.tsx`. **Note:** CC BY-SA is share-alike — derived
versions of those specific images must be redistributed under the same
license, not MIT.

## External services queried at runtime

Queried live; no data from them is redistributed in this repository.

- **GBIF** occurrence records — https://www.gbif.org
- **IUCN Red List** — https://www.iucnredlist.org (status values in
  `data/component_6/species_cache.json` are manually transcribed; see that
  file's `_meta` block for per-entry verification status)
- **CARTO / OpenStreetMap** basemap tiles — attribution rendered on the map

## AI-generated media

All decorative artwork and video in `frontend/public/` and
`frontend/public/creatures/` was generated with generative AI tools
(primarily Google Gemini) by the project authors. This covers:

- the large `.png` / `.jpg` files, including `dna_hologram_*.png` and
  `user_footer_background.jpeg`
- the video files `loop.mp4`, `opening.mp4`, and `opening.reverse.mp4`

Two practical consequences:

- Output rights come from the generating tool's terms of service at time of
  generation, not from this repository's MIT license.
- Purely AI-generated images may not attract copyright in some jurisdictions
  (notably the US), so these are not asserted as MIT-licensed original works.
  They are provided as-is for use with this project.

The small `.webp` creature files are the Wikimedia Commons images listed
above, not AI-generated.
