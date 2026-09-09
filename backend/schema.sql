-- ANVESH database schema — the four tables from the architecture doc,
-- plus users for authentication.

-- email/password_hash are nullable now: GitHub-login users (github_id set)
-- never get a password, and GitHub doesn't always expose an email either.
-- Existing databases from before GitHub login won't pick up the new
-- columns from this CREATE TABLE (SQLite doesn't retroactively ALTER on
-- IF NOT EXISTS) — see the migration in backend/main.py's init_db().
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    github_id INTEGER UNIQUE,
    github_username TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    collection_lat REAL,
    collection_lon REAL,
    collection_date TEXT,
    marker_gene TEXT,              -- '12S', '16S', or 'COI'
    status TEXT DEFAULT 'uploaded', -- uploaded -> classifying -> done
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id INTEGER NOT NULL REFERENCES samples(id),
    species_name TEXT NOT NULL,
    read_count INTEGER NOT NULL,       -- needed for the biodiversity indices, not just presence/absence
    confidence_score REAL,
    classifier_sources TEXT,           -- e.g. "mmseqs2,barcodebert" — which tools contributed to this call
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS species_cache (
    species_name TEXT PRIMARY KEY,
    gbif_info_json TEXT,
    occurrence_points_json TEXT,
    cached_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conservation_status (
    species_name TEXT PRIMARY KEY,
    iucn_status TEXT,
    wildlife_act_schedule TEXT
);