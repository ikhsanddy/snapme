-- M6: tabel strips dan bucket pribadi (ARCHITECTURE §7).
-- RLS dinyalakan tanpa satu pun policy: peran `anon` dan `authenticated`
-- ditolak seluruhnya, sedangkan kunci service role melewatinya. Berkas di
-- Storage dibaca hanya lewat URL bertanda tangan yang dibuat server, jadi URL
-- itu sendiri berlaku sebagai kapabilitas dan tidak butuh policy.
-- Kolom `live_path` dan `relay_id` sudah disiapkan untuk M7 dan M8 supaya
-- tidak perlu ALTER lagi.

create table if not exists public.strips (
  id text primary key,
  layout text not null,
  still_path text,
  live_path text,
  status text not null default 'draft' check (status in ('draft', 'complete', 'deleted')),
  delete_token_hash text not null,
  relay_id text,
  rate_key text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.strips enable row level security;

-- Pembersih harian menyaring lewat expires_at; pembatasan laju menyaring
-- lewat rate_key dan created_at. Baris `deleted` adalah batu nisan: berkasnya
-- sudah dihapus saat permintaan hapus, tetapi barisnya disimpan sampai token
-- unggah bertanda tangan kedaluwarsa supaya berkas yang diunggah setelah
-- penghapusan tetap ikut dibersihkan, dan supaya kuota pembatasan laju tidak
-- bisa dikembalikan dengan menghapus barisnya.
create index if not exists strips_expiry_idx on public.strips (expires_at);
create index if not exists strips_rate_idx on public.strips (rate_key, created_at);

-- Batas ukuran dan jenis ditegakkan di bucket, bukan hanya di rute complete
-- (ARCHITECTURE §8: "dibatasi pada URL unggah"). Rute complete tetap memeriksa
-- ulang sebagai pagar kedua.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('snapme', 'snapme', false, 2097152, array['image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
