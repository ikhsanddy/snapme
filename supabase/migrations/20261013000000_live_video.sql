-- M7: bucket menerima klip video Strip Hidup (ARCHITECTURE §7, PRD §8 batas
-- klip 5 MB). Batas 2 MB untuk still kini ditegakkan rute complete, karena
-- batas bucket hanya satu angka untuk semua berkas; daftar jenis tetap
-- tertutup supaya jenis lain tidak bisa masuk.

update storage.buckets
  set file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'video/webm', 'video/mp4']
  where id = 'snapme';
