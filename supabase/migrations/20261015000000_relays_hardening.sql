-- M9: pengerasan tabel relays (sisa temuan M8).
-- 1. `strip_id` mengikat estafet ke strip hasilnya. Sebelumnya hubungan itu
--    hanya satu arah (`strips.relay_id`), dan jalur pemulihan (estafet sudah
--    `complete` tetapi stripnya sudah dihapus) bisa membuat dua baris strips
--    ber-`relay_id` sama bila dua permintaan datang bersamaan. Rutenya kini
--    memakai kolom ini sebagai gerbang pemenang tunggal: UPDATE bersyarat
--    `strip_id is null` yang hanya boleh berhasil sekali.
-- 2. `layout` dibatasi ke ID yang ada di src/lib/layouts.ts, dan `slots`
--    dipastikan array. Bentuk tiap elemen slot tetap diperiksa saat dibaca
--    (relaySlotsOf), karena check constraint tidak bisa menolak satu elemen
--    cacat tanpa menjatuhkan seluruh baris.
-- 3. Indeks unik `strip_id` menutup sisa balapan: satu estafet, satu strip.

alter table public.relays add column if not exists strip_id text;

alter table public.relays add constraint relays_layout_check
  check (layout in ('strip-4', 'strip-3', 'grid-2x2'));

alter table public.relays add constraint relays_slots_array_check
  check (jsonb_typeof(slots) = 'array');

create unique index if not exists relays_strip_id_key
  on public.relays (strip_id) where strip_id is not null;
