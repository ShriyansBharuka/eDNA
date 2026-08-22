# Conservation Flagging (Component 6)

## What this does

Given a species name that the classification pipeline has already identified,
this checks whether that species is endangered or legally protected, and
returns a flag. It does **not** do any species identification itself — it
runs strictly *after* Components 2/3 have already produced a species name.

## Why it's built this way

**No live API calls.** IUCN Red List API registration has real lead time
(days, not hours) and there's no clean public API for Wildlife Protection
Act data at all — it has to be manually compiled. Rather than half-build a
live integration we couldn't finish before the demo, we pre-researched a
species table and cached it as a static JSON file. This also means the
demo never depends on network access or an external service being up
during judging — a dead API call at the wrong moment shouldn't be able to
break Component 6's slice of the dashboard.

**Placeholder species set.** The actual species that'll come out of the
Data Layer / Classification Engine (components 1–3) aren't finalized yet.
So `species_cache.json` currently holds 18 plausible marine vertebrate eDNA
species (sharks, rays, sea turtles, dugong, tuna, reef fish) spanning IUCN
categories CR/EN/VU/LC — including a few deliberately unflagged "control"
species (sardine, herring, skipjack tuna) so the demo visibly proves the
system doesn't just flag everything. **This needs to be swapped for the
real detected species once that list exists** — same file, same format,
just different rows.

## Files

- **`species_cache.json`** — the lookup table. One entry per species with:
  `scientific_name`, `common_name`, `iucn_category`, `cites_appendix`,
  `wpa_schedule`, `notes`.
- **`conservation_flag.py`** — the lookup/flagging logic. Already tested
  standalone (`python conservation_flag.py` runs a smoke test).

## API for Sunanda to call

```python
from conservation_flag import flag_species, flag_batch

flag_species("Sphyrna lewini")
# {
#   "scientific_name": "Sphyrna lewini",
#   "common_name": "Scalloped hammerhead shark",
#   "found_in_cache": True,
#   "iucn_category": "CR",
#   "cites_appendix": "II",
#   "wpa_schedule": None,
#   "is_flagged": True,
#   "flag_reason": "IUCN CR"
# }

flag_batch(["Sphyrna lewini", "Sardinella longiceps"])
# returns a list of the above, one dict per species
```

For a whole sample's detection list, call `flag_batch()` with the list of
species names the classifier returned, and drop the result straight into
the `conservation_status` field of whatever the `/samples/{id}/results`
response looks like.

## What triggers a flag

A species is flagged (`is_flagged: True`) if **any** of:
- IUCN category is CR, EN, or VU
- WPA Schedule I or II
- CITES Appendix I

This threshold is a judgment call, not a fixed standard — NT (Near
Threatened) and Schedule III/IV are treated as informational, not flagged,
since the goal is to surface genuine conservation concern for judges, not
bury it in noise. Easy to change: it's the `FLAG_TRIGGER_CATEGORIES` set
and the `if` block in `flag_species()`.

## What's *not* handled yet (heads up, not blocking)

- **Species not in the cache** return `found_in_cache: False` and
  `is_flagged: False` — i.e. "no data" currently reads the same as "safe."
  If the team wants to visually distinguish "confirmed not a concern" from
  "we don't have data on this one," that's a small change to the return
  shape — flag it if the dashboard needs that distinction.
- **Name matching is exact** (case-insensitive scientific name only). If
  the classifier ever returns genus-only IDs or common names instead of
  full binomial names, lookups will miss. Worth confirming what format
  Components 2/3 actually emit before final wiring.

## Swapping in the real species list

Once Shriyans's Data Layer has a real reference species set, replace the
`"species"` array in `species_cache.json` with the actual list — research
each one's IUCN/CITES/WPA status the same way, same field names. No code
changes needed in `conservation_flag.py`; it just reads whatever's in the
JSON.
