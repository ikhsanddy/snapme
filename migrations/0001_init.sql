-- M10: skema D1 pengganti lima migrasi Postgres di supabase/migrations.
-- Dialek SQLite: tidak ada tipe uuid/timestamptz, jadi ID tetap teks dan
-- timestamp menjadi TEXT ISO-8601 UTC yang selalu diisi aplikasi lewat
-- new Date().toISOString(). Perbandingan leksikografis pada format itu sama
-- dengan perbandingan kronologis, sehingga indeks kedaluwarsa tetap bekerja.
--
-- RLS Postgres tidak dipindahkan: D1 hanya bisa diakses lewat binding Worker,
-- jadi tidak ada jalur anon yang perlu ditolak.

CREATE TABLE IF NOT EXISTS strips (
  id TEXT PRIMARY KEY,
  layout TEXT NOT NULL,
  still_path TEXT,
  live_path TEXT,
  -- `deleted` adalah batu nisan penghapusan: berkasnya sudah dibuang, barisnya
  -- menunggu masa tenggang supaya pembersih tetap tahu path berkas yang
  -- mungkin diunggah setelah penghapusan.
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','complete','deleted')),
  delete_token_hash TEXT NOT NULL,
  relay_id TEXT,
  rate_key TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS strips_expiry_idx ON strips (expires_at);
CREATE INDEX IF NOT EXISTS strips_rate_idx ON strips (rate_key, created_at);

CREATE TABLE IF NOT EXISTS relays (
  id TEXT PRIMARY KEY,
  layout TEXT NOT NULL CHECK (layout IN ('strip-4','strip-3','grid-2x2')),
  -- Bentuk tiap elemen slot tetap diperiksa saat dibaca (relaySlotsOf) seperti
  -- di Postgres: check ini menjaga kolomnya array JSON yang sah, bukan bentuk
  -- elemennya.
  slots TEXT NOT NULL CHECK (json_valid(slots) AND json_type(slots) = 'array'),
  host_token_hash TEXT NOT NULL,
  guest_token_hash TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','claimed','complete','cancelled')),
  rate_key TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  expires_at TEXT,
  -- Gerbang pemenang tunggal jalur pemulihan (M9): satu estafet hanya boleh
  -- menunjuk satu strip aktif, dijaga indeks unik parsial.
  strip_id TEXT
);
CREATE INDEX IF NOT EXISTS relays_expiry_idx ON relays (expires_at);
CREATE INDEX IF NOT EXISTS relays_rate_idx ON relays (rate_key, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS relays_strip_id_key ON relays (strip_id) WHERE strip_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rate_key TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_rate_idx ON events (rate_key, created_at);
CREATE INDEX IF NOT EXISTS events_name_idx ON events (name, created_at);
