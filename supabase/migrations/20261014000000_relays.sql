-- M8: tabel relays untuk Strip Estafet (ARCHITECTURE §7, PRD §7.3).
-- RLS dinyalakan tanpa satu pun policy, sama seperti strips: peran `anon` dan
-- `authenticated` ditolak seluruhnya, sedangkan kunci service role melewatinya.
-- `slots` menyimpan jsonb [{ index, owner, path }] supaya path berkas tiap
-- slot diketahui pembersih dan permintaan hapus tanpa membaca Storage.
-- `expires_at` link estafet 48 jam sejak dibuat (SE-08) dan tidak diperpanjang
-- saat temannya mengambil giliran atau menuntaskan strip; baris yang dibatalkan
-- memakai masa tenggang penghapusan yang sama dengan strip (batu nisan),
-- supaya berkas yang diunggah setelah pembatalan tetap ikut dibersihkan.

create table if not exists public.relays (
  id text primary key,
  layout text not null,
  slots jsonb not null,
  host_token_hash text not null,
  guest_token_hash text,
  status text not null default 'waiting' check (status in ('waiting', 'claimed', 'complete', 'cancelled')),
  rate_key text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.relays enable row level security;

-- Pembersih harian menyaring lewat expires_at; pembatasan laju lewat rate_key
-- dan created_at, sama seperti strips.
create index if not exists relays_expiry_idx on public.relays (expires_at);
create index if not exists relays_rate_idx on public.relays (rate_key, created_at);

-- Slot estafet selalu JPEG (ekspor bingkai kamera lewat kanvas). Batas 1 MB
-- ditegakkan rute, karena batas bucket hanya satu angka untuk semua berkas
-- (5 MB milik klip Strip Hidup).
update storage.buckets
  set allowed_mime_types = array['image/png', 'video/webm', 'video/mp4', 'image/jpeg']
  where id = 'snapme';
