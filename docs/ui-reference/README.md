# Halaman acuan UI snapme

Acuan pasti tampilan snapme. Buka berkas HTML langsung di browser (klik dua kali), tanpa server dan tanpa build.

| Berkas | Halaman | Rute di produk | Yang bisa dicoba |
|---|---|---|---|
| `welcome.html` | Welcome | `/` | Tautan "Mulai Foto" dan "Pakai Foto Galeri" |
| `capture.html` | Ambil Foto | `/booth/capture` | Tombol kamera (hitung mundur), pil "Angkat dua jari" (simulasi gesture), sakelar Gesture Snap, "Ulang foto terakhir" |
| `customize.html` | Hias Strip | `/booth/customize` | Tab Frame, Efek, Stiker, sakelar Strip Hidup dan QR |
| `referensi_uiux.webp` | Gambar arah gaya | | |

Catatan:

- Token dan aturan ada di `DESIGN-SYSTEM.md`. Bila berkas di sini berbeda dengan dokumen itu, dokumen itu yang menang.
- Gaya ditulis inline dengan nilai mentah supaya mudah dibaca. Di kode produk selalu pakai token dan komponen.
- `capture.html` dan `customize.html` memakai mesin templat kecil di bagian bawah berkas untuk interaksinya. Itu bukan kode produk.
- Fon dimuat dari Google Fonts, jadi butuh internet agar tampil dengan fon yang benar.
- Foto dan pratinjau kamera adalah blok warna berlabel.
- Nama, logo, dan aset Fujifilm di gambar referensi tidak boleh dipakai.
