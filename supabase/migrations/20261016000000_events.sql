-- M9: tabel `events` untuk analitik first-party (PRD §4).
-- Tanpa cookie dan tanpa data pribadi: yang disimpan hanya nama peristiwa,
-- sidang pembatasan laju (SHA-256 alamat IP + garam dari env, sama seperti
-- tabel lain), dan waktu. Tidak ada kolom sesi, perangkat, atau jalur.
-- RLS dinyalakan tanpa satu pun policy: hanya kunci service role yang boleh
-- menulis dan membaca, jadi tabel ini tidak bisa dijangkau halaman klien.
-- Retensi 90 hari, dibersihkan GET /api/cron/purge.

create table if not exists public.events (
  id bigint generated always as identity primary key,
  name text not null,
  rate_key text not null default '',
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- Pembatasan laju menyaring lewat rate_key dan created_at; pembersih lewat
-- created_at. Indeks nama untuk kueri rasio di docs/DECISIONS.md.
create index if not exists events_rate_idx on public.events (rate_key, created_at);
create index if not exists events_name_idx on public.events (name, created_at);
