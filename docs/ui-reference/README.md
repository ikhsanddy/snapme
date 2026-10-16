# Halaman acuan UI snapme

Acuan pasti tampilan snapme. Buka berkas HTML langsung di browser (klik dua kali), tanpa server dan tanpa build.

| Berkas | Halaman | Rute di produk | Yang bisa dicoba |
|---|---|---|---|
| `welcome.html` | Welcome | `/` | Tautan "Mulai Foto" dan "Pakai Foto Galeri" |
| `capture.html` | Ambil Foto | `/booth/capture` | Tombol kamera (hitung mundur), pil "Angkat dua jari" (simulasi gesture), sakelar Gesture Snap, "Ulang foto terakhir" |
| `customize.html` | Hias Strip | `/booth/customize` | Tab Frame, Efek, Stiker, sakelar Strip Hidup dan QR |
| `referensi_uiux.webp` | Gambar arah gaya | | |

Catatan:

- `referensi_uiux.webp` **tidak ikut di-commit** (ada di `.gitignore`). Isinya kumpulan tangkapan layar produk photobooth lain beserta merek dan foto pelanggannya, jadi tidak boleh disebarkan ulang bersama repo ini (AGENTS.md "Batas aman"). Berkasnya tetap ada di perangkat pengguna sebagai arah gaya; token di `DESIGN-SYSTEM.md §2` sudah memuat arah itu dan berkas HTML di folder ini menggantikannya untuk pekerjaan harian.
- Token dan aturan ada di `DESIGN-SYSTEM.md`. Bila berkas di sini berbeda dengan dokumen itu, dokumen itu yang menang.
- Gaya ditulis inline dengan nilai mentah supaya mudah dibaca. Di kode produk selalu pakai token dan komponen.
- `capture.html` dan `customize.html` memakai mesin templat kecil di bagian bawah berkas untuk interaksinya. Itu bukan kode produk.
- Fon dimuat dari Google Fonts, jadi butuh internet agar tampil dengan fon yang benar.
- Foto dan pratinjau kamera adalah blok warna berlabel.
- Nama, logo, dan aset Fujifilm di gambar referensi tidak boleh dipakai.
