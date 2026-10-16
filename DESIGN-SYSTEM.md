# snapme: Design System

Versi 0.1, 8 Oktober 2026. Dokumen ini adalah sumber kebenaran tampilan snapme. Dibaca bersama `PRD.md` dan `ARCHITECTURE.md`.

Acuan visual, semuanya di `docs/ui-reference/`:

| Berkas | Isi | Rute di produk |
|---|---|---|
| `welcome.html` | Halaman acuan Welcome | `/` |
| `capture.html` | Halaman acuan Ambil Foto, bisa diklik (hitung mundur, gesture, ulang) | `/booth/capture` |
| `customize.html` | Halaman acuan Hias Strip, bisa diklik (frame, efek, stiker, sakelar) | `/booth/customize` |
| `referensi_uiux.webp` | Gambar referensi gaya (kios photobooth Y2K). **Tidak ikut di-commit**: berkas pihak ketiga, alasannya di `docs/ui-reference/README.md` | |

Tiga berkas HTML itu mandiri (buka langsung di browser) dan menjadi **acuan pasti** susunan, ukuran, dan keadaan tiap halaman. Dokumen ini menjadi acuan pasti token dan aturan. Bila keduanya berbeda, dokumen ini yang menang dan perbedaannya dilaporkan. Berkas HTML menulis gaya inline dengan nilai mentah supaya terbaca jelas: di kode produk nilai itu selalu diganti token (§13) dan komponen (§9). Gambar referensi dipakai sebagai arah gaya saja: nama, logo, dan aset Fujifilm tidak boleh dipakai.

## 0. Cara memakai dokumen ini

### Urutan yang menang bila bertentangan

1. `DESIGN-SYSTEM.md` (dokumen ini)
2. Bawaan library komponen (shadcn/ui, registry neobrutalism)

Artinya: pasang komponen jadi dulu, lalu ubah tampilannya lewat token di sini. Jangan menulis komponen dari nol bila padanannya ada (ARCHITECTURE §2), dan jangan membiarkan tampilan bawaan library lolos tanpa disesuaikan.

### Keputusan yang sengaja menimpa bawaan library komponen

| Bawaan library komponen | Keputusan snapme | Alasan |
|---|---|---|
| Maksimal 1 warna aksen | Empat warna merek, masing-masing satu peran tetap (§2) | Identitas dari gambar referensi. Konsistensi dijaga lewat peran, bukan jumlah |
| Bayangan diwarnai mengikuti latar, tanpa hitam pekat | Bayangan keras `ink` tanpa blur (§4) | Ciri neo-brutalist |
| Mode gelap wajib | Tema terang saja pada v1 | Latar lime adalah identitas. Token dibuat semantik supaya tema gelap bisa ditambah nanti |
| Satu skala radius | Aturan campuran terdokumentasi (§4): kontrol berbentuk pil, wadah bersudut 20 atau 14 px | Dokumen ini mengizinkan campuran bila aturannya tertulis dan dipatuhi |

Aturan gaya lain di dokumen ini berlaku apa adanya, terutama: tanpa em dash di teks antarmuka, tanpa emoji, tanpa `#000` dan `#fff` murni, ikon dari Phosphor, animasi lewat `motion/react`, tanpa tiga kartu fitur sama lebar, satu label per maksud.

## 1. Arah visual

Y2K neo-brutalist yang ceria: panggung lime bergaris kisi, panel krem bergaris tepi hitam tebal, tombol pil, judul gemuk berwarna pink dengan bayangan keras, aksen papan catur ungu, stiker yang ditempel miring.

| Lakukan | Hindari |
|---|---|
| Garis tepi `ink` 2 sampai 3 px di semua komponen | Garis tipis abu-abu, bayangan lembut ber-blur |
| Warna datar | Gradasi sebagai hiasan, efek kaca |
| Satu aksi utama jingga per layar | Dua tombol jingga dalam satu tampilan |
| Stiker dan label miring 4 sampai 12 derajat sebagai aksen | Memiringkan kontrol yang harus diklik atau dibaca panjang |
| Ruang kosong lime di sekeliling panel | Panel menempel ke tepi layar di desktop |

## 2. Warna

### Token

| Token | Nilai | Peran (satu peran per warna) |
|---|---|---|
| `ink` | `#141414` | Teks, garis tepi, bayangan keras, pil terpilih |
| `paper` | `#FFFDF7` | Permukaan panel, teks di atas `violet` dan `ink` |
| `cream` | `#F4F1E6` | Permukaan sekunder: area kanvas, chip netral, tombol nonaktif |
| `lime` | `#C3F53C` | Panggung (latar halaman), status berhasil, sorotan informatif |
| `tangerine` | `#F0562B` | **Aksi utama saja**: satu per layar (Mulai Foto, Lanjut Hias, Selesai & Unduh, tombol kamera) |
| `violet` | `#5038D6` | Aksi sekunder, penanda terpilih (cincin dan lencana centang), cincin fokus, sakelar menyala, pola catur |
| `violet-soft` | `#A9A4F4` | Latar ilustratif dan kartu Strip Estafet. Bukan untuk teks |
| `pink` | `#F2479B` | Judul display 24 px ke atas, pil penghitung, angka terakhir hitung mundur. Bukan isian tombol |
| `pink-700` | `#CF1874` | Teks pink di bawah 24 px (harga, penekanan), hanya di atas `paper` atau `cream` |
| `muted` | `#5E5E57` | Teks sekunder, garis putus-putus slot kosong |
| `danger` | `#B42318` | Teks dan ikon galat, hanya di atas `paper` atau `cream` |

### Pasangan teks yang diizinkan

Rasio kontras dihitung dengan rumus WCAG 2.x. Batas: 4,5 untuk teks biasa, 3 untuk teks 24 px ke atas dan komponen nonteks.

| Teks | Latar | Rasio | Pemakaian |
|---|---|---|---|
| `ink` | `paper` | 18,11 | Teks utama |
| `ink` | `cream` | 16,29 | Teks di area kanvas |
| `ink` | `lime` | 14,43 | Teks di panggung dan chip lime |
| `ink` | `violet-soft` | 8,16 | Kartu Strip Estafet |
| `ink` | `pink` | 5,40 | Pil penghitung |
| `ink` | `tangerine` | 5,33 | **Label tombol utama selalu `ink`** |
| `paper` | `violet` | 7,17 | Label tombol sekunder |
| `paper` | `ink` | 18,11 | Pil terpilih, ubin gelap |
| `lime` | `ink` | 14,43 | Judul di ubin gelap |
| `violet` | `lime` | 5,72 | Cincin fokus di panggung |
| `muted` | `paper` / `cream` / `lime` | 6,42 / 5,78 / 5,12 | Teks sekunder |
| `pink-700` | `paper` / `cream` | 5,12 / 4,60 | Teks pink kecil |
| `danger` | `paper` / `cream` | 6,46 / 5,81 | Pesan galat |
| `pink` | `paper` | 3,36 | **Hanya judul 24 px ke atas**, selalu dengan bayangan keras `ink` |

Dilarang karena gagal kontras: `paper` di atas `tangerine` (3,40), `pink` di atas `lime` (2,67), `pink` di atas `cream` untuk teks di bawah 24 px (3,02), cincin fokus `violet` di atas `ink` (2,52, pakai `lime`).

### Aturan pakai

- Urutan penekanan dalam satu layar: `tangerine` (1 elemen), lalu `violet`, lalu `ink`.
- Status tidak boleh hanya dibedakan warna: selalu disertai ikon atau teks (centang untuk terpilih, teks "Nyala" dan "Mati" pada sakelar).
- `lime` di atas `paper` tidak cukup kontras untuk dibaca sendirian (1,26): elemen lime selalu bergaris tepi `ink`.

## 3. Tipografi

Tiga keluarga, dimuat lewat `next/font/google` (di-host sendiri saat build, bukan `<link>` ke Google Fonts).

| Peran | Fon | Berat | Pemakaian |
|---|---|---|---|
| Display | Unbounded | 700, 800, 900 | Wordmark, judul halaman, judul kartu, angka hitung mundur |
| Teks | Space Grotesk | 500, 700 | Paragraf, label tombol, isi formulir |
| Mono | Space Mono | 400, 700 | Label kecil huruf besar, penghitung, ukuran ekspor, pintasan keyboard |

| Gaya | Spesifikasi |
|---|---|
| `display-xl` | Unbounded 900, `clamp(36px, 5.2vw, 68px)`, tinggi baris 1, huruf besar, `pink` + `text-shadow: 4px 4px 0 ink` + `-webkit-text-stroke: 1.5px ink` |
| `display-lg` | Unbounded 900, `clamp(22px, 3vw, 34px)`, huruf besar, `pink` + `text-shadow: 3px 3px 0 ink`. Judul panel ("AMBIL FOTO") |
| `heading` | Unbounded 800, `clamp(22px, 2.6vw, 32px)`, `ink`, huruf biasa |
| `title` | Unbounded 800, 16 sampai 22 px. Judul kartu |
| `body` | Space Grotesk 500, 16 px / 1,5. Di hero 18 px |
| `body-sm` | Space Grotesk 500, 14 sampai 15 px / 1,4 |
| `button` | Space Grotesk 700, 15 px (kecil), 18 px (besar) |
| `label` | Space Mono 700, 12 px, huruf besar, `letter-spacing: 0.06em` |
| `numeral` | Space Mono 700, `font-variant-numeric: tabular-nums` |

Aturan: panjang baris maksimal 44 sampai 65 karakter. Huruf besar hanya untuk `display-xl`, `display-lg`, dan `label`. Paling banyak satu `label` di atas judul per tiga bagian halaman.

## 4. Bentuk

| Properti | Token | Nilai | Dipakai pada |
|---|---|---|---|
| Garis tepi | `border-panel` | 3 px `ink` | Panel utama, area kamera, kanvas strip |
| | `border-control` | 2 px `ink` | Tombol, chip, kartu, input, thumbnail |
| | `border-empty` | 2 px putus-putus `muted` | Slot kosong, tombol nonaktif |
| Radius | `radius-panel` | 20 px | Panel utama, ubin fitur |
| | `radius-stage` | 16 px | Area kamera, area kanvas |
| | `radius-card` | 14 px | Kartu di rel samping |
| | `radius-thumb` | 10 px | Thumbnail, swatch |
| | `radius-pill` | 999 px | **Semua kontrol interaktif**: tombol, chip, tab, sakelar, penghitung |
| Bayangan | `shadow-hard-sm` | `3px 3px 0 ink` | Stiker |
| | `shadow-hard` | `4px 4px 0 ink` | Tombol |
| | `shadow-hard-lg` | `6px 6px 0 ink` | Panel utama, ubin |
| | `shadow-hard-violet` | `6px 6px 0 violet` | Elemen `ink` (ubin gelap, strip hitam, lingkaran hitung mundur) |

Tidak ada bayangan ber-blur. Kedalaman hanya dari garis tepi dan bayangan keras.

## 5. Tata letak

- Satuan spasi 4 px: 4, 8, 12, 16, 20, 24, 32, 40, 56.
- Wadah halaman: `max-width: 1280px`, padding samping `clamp(16px, 3vw, 40px)`.
- Titik henti: 640, 768, 1024, 1280 px.
- Target sentuh minimal 44 x 44 px. Aksi utama setinggi 56 px.
- Tinggi layar penuh memakai `min-height: 100dvh`, bukan `100vh` atau `h-screen`.

### Booth Shell (kerangka semua langkah booth)

```
[ panggung lime bergaris kisi ]
  baris atas: wordmark (kiri)            stepper: Layout, Foto, Hias, Hasil (kanan)
  ┌─ panel paper, garis 3px, radius 20, shadow-hard-lg ────────────────────────┐
  │ kepala panel: [kembali] JUDUL  chip konteks      ...   kontrol kanan        │
  ├────────────────────────────────────────────────────────────────────────────┤
  │ rel kiri (1 bagian)   │ panggung tengah (3 bagian)  │ rel kanan (1 bagian)   │
  │ pilihan atau baki     │ kamera atau kanvas          │ konteks + aksi utama   │
  └────────────────────────────────────────────────────────────────────────────┘
```

| Lebar | Susunan |
|---|---|
| 1024 px ke atas | Tiga kolom: rel kiri 200 sampai 264 px, tengah lentur, rel kanan 240 sampai 304 px |
| 768 sampai 1023 px | Tengah di atas selebar penuh, kedua rel berdampingan di bawahnya |
| di bawah 768 px | Satu kolom: tengah dulu, lalu pilihan, lalu konteks. Aksi utama menempel di bawah layar |

Stepper: langkah selesai = pil `paper` dengan centang, langkah sekarang = pil `ink` teks `paper` (`aria-current="step"`), langkah berikutnya = pil bergaris tanpa isi.

### Geometri ekspor

| Layout | Kanvas | Margin | Slot | Jarak | Kaki |
|---|---|---|---|---|---|
| Strip 4 | 600 x 1800 px | 36 | 528 x 372 (4 buah) | 24 | 204 |
| Strip 3 | 600 x 1800 px | 36 | 528 x 504 (3 buah) | 24 | 204 |
| Grid 2 x 2 | 1200 x 1800 px | 48 | 540 x 744 (4 buah) | 24 | 240 |

Kaki strip memuat wordmark di kiri dan QR 168 x 168 px di kanan (bila diaktifkan). Rasio area kamera dan thumbnail selalu mengikuti rasio slot layout yang dipilih.

## 6. Pola dekoratif

| Pola | Resep | Batas pakai |
|---|---|---|
| Kisi panggung | Dua `linear-gradient` garis 1,5 px `rgba(20,20,20,0.08)`, ukuran 56 x 56 px, di atas `lime` | Hanya latar halaman |
| Papan catur | `repeating-conic-gradient(violet 0% 25%, paper 0% 50%)`, petak 20 px, bergaris bawah 3 px `ink` | Pita setinggi 20 px di tepi atas panel hero atau sudut panel. Maksimal satu per layar |
| Label miring | Chip `label` berlatar `lime`, diputar 6 derajat | Aksen di area ilustratif, maksimal dua per layar |
| Braket bidik | Empat sudut garis 4 px `lime` di dalam area kamera | Hanya area kamera |

## 7. Gerak

Pustaka: `motion` (impor dari `motion/react`). Hanya `transform` dan `opacity` yang dianimasikan.

| Gerak | Spesifikasi | Maksud |
|---|---|---|
| Tekan tombol | Hover: geser -1, -1 px dan bayangan 5 px. Aktif: geser 4, 4 px dan bayangan 0. 120 ms | Umpan balik fisik |
| Angka hitung mundur | Muncul dari skala 0,6 ke 1 dengan lewatan 1,08, 500 ms, `cubic-bezier(0.16, 1, 0.3, 1)` | Menarik perhatian tepat waktu |
| Indikator tahan gesture | Batang terisi linear selama durasi tahan | Menunjukkan sisa waktu tahan |
| Kilat foto | Lapisan `paper` opasitas 0,9 selama 160 ms, sekali | Konfirmasi foto terambil |
| Stiker ditempel | Skala 0 ke 1 dengan pegas (stiffness 100, damping 20) | Terasa ditempel |
| Pindah langkah | Geser masuk 24 px + pudar, 200 ms | Kesinambungan |

`prefers-reduced-motion: reduce`: semua di atas menjadi perubahan langsung. Kilat foto diganti kedip garis tepi area kamera. Pratinjau Strip Hidup berhenti dan diberi tombol Putar.

## 8. Ikon dan aset

- Ikon: `@phosphor-icons/react`, bobot **bold**, satu keluarga untuk seluruh produk. shadcn/ui bawaannya memakai `lucide-react`: ganti saat menambah komponen. Ukuran 16, 20, 24, 36 px. Jangan menggambar path ikon sendiri.
- Gesture selalu digambarkan dengan ikon (`HandPeace`, `HandPalm`, `ThumbsUp`), bukan emoji.
- Stiker dan seni frame: berkas PNG atau SVG di `public/stickers` dan `public/frames`. Wajib ditinjau manusia sebelum masuk repo. Gaya: warna datar dari palet §2, garis tepi `ink`, tanpa gradasi.
- Fon di berkas acuan dimuat dari Google Fonts supaya berkasnya mandiri. Produk tetap memakai `next/font` (§3).
- Foto contoh di Welcome: belum ada. Di halaman acuan slotnya berlabel "Foto contoh". Isi dengan foto asli yang punya izin pakai, atau biarkan sebagai blok warna berlabel. Jangan memakai wajah orang tanpa izin.

## 9. Komponen

Kolom "Dasar" adalah komponen jadi yang dipasang dulu. Kolom berikutnya adalah penyesuaiannya. Evaluasi registry neobrutalism ada di ARCHITECTURE §3.

| Komponen | Dasar | Varian dan penyesuaian |
|---|---|---|
| Button | shadcn `button` | `primary` (isi `tangerine`, teks `ink`), `secondary` (isi `violet`, teks `paper`), `neutral` (isi `paper`), `ghost` (tanpa isi, bergaris). Ukuran `sm` 44 px, `lg` 56 px. Semua: pil, garis 2 px, `shadow-hard`, gerak tekan §7. Nonaktif: isi `cream`, teks `muted`, garis putus-putus, tanpa bayangan |
| IconButton | shadcn `button` ukuran ikon | Lingkaran 44 px bergaris. Wajib `aria-label` |
| Chip / Badge | shadcn `badge` | Gaya `label`, pil, garis 2 px. Isi `cream` (netral), `lime` (positif), `pink` (penghitung) |
| Tabs pil | shadcn `toggle-group` (tunggal) | Terpilih: isi `ink`, teks `paper`. Lainnya: isi `paper` |
| Switch | shadcn `switch` | 56 x 32 px, garis 2 px. Mati `cream`, nyala `violet`. Selalu ada teks keadaan di dekatnya |
| Card | shadcn `card` | `radius-card`, garis 2 px, tanpa bayangan di dalam panel. Ubin fitur: `radius-panel`, `shadow-hard-lg` |
| Dialog | shadcn `dialog` | Panel `paper`, garis 3 px, `shadow-hard-lg`. Dipakai untuk persetujuan unggah |
| Drawer | shadcn `drawer` | Lembar bawah untuk pilihan hias di layar sempit |
| Toast | shadcn `sonner` | Kartu bergaris 2 px, isi `paper`. Hanya untuk pesan sementara |
| Tooltip | shadcn `tooltip` | Isi `ink`, teks `paper`, radius 8 px |
| Slider | shadcn `slider` | Rel 8 px bergaris, isi `violet`, gagang lingkaran `paper` bergaris |
| Skeleton | shadcn `skeleton` | Isi `cream` bergaris putus-putus, mengikuti bentuk akhir. Tanpa spinner bulat |
| Carousel | shadcn `carousel` | Daftar template di layar sempit |
| Swatch terpilih | Tombol + pola sendiri | Cincin `0 0 0 3px paper, 0 0 0 6px violet` dan lencana centang `violet` di sudut kanan atas |
| Stepper | Daftar `ol` + Badge | Lihat §5 |

Komponen khas produk yang memang harus dibuat sendiri, dari primitif di atas dan token di sini:

| Komponen | Isi |
|---|---|
| `CameraStage` | Area kamera `ink`, garis 3 px, `radius-stage`, braket bidik, tempat HUD dan overlay |
| `GestureHUD` | Pil di atas tengah area kamera. Empat keadaan: siap ("Angkat dua jari, tahan sebentar"), menahan (isi `lime`, batang `violet`), mati, selesai |
| `CountdownOverlay` | Lingkaran 168 px, garis 4 px, `shadow-hard-violet`, angka Unbounded 900 96 px. Isi `lime` untuk 3 dan 2, `pink` untuk 1 |
| `ShutterButton` | Lingkaran 76 px `tangerine`, garis 3 px `paper`, ikon kamera 34 px, di tengah bawah area kamera |
| `ShotTray` | Kisi 2 kolom. Terisi: thumbnail bergaris + lencana centang. Kosong: garis putus-putus + nomor slot |
| `StripCanvas` | Pratinjau strip di atas `cream`, `shadow-hard` 8 px. Dirender dengan react-konva |
| `StickerItem` | Stiker di kanvas dengan pegangan ubah ukuran dan putar |
| `QRPlate` | Kotak `paper` bergaris 2 px berisi QR, di kanan kaki strip |
| `RelayInviteCard` | Kartu `violet-soft`: judul, satu kalimat, tombol sekunder "Estafet ke Teman" |
| `LiveStripPlayer` | Strip dengan slot berputar. Lencana "Klip" di sudut kiri bawah slot |

Setiap komponen interaktif punya keadaan: bawaan, hover, fokus terlihat, aktif, nonaktif, memuat. Cincin fokus: 3 px `violet`, jarak 3 px. Di atas permukaan `ink`: 3 px `lime`.

## 10. Tiga halaman acuan

Tiap bagian di bawah meringkas satu berkas di `docs/ui-reference/`. Baca berkas HTML-nya untuk ukuran, jarak, dan keadaan yang persis. Halaman produk dibandingkan berdampingan dengan berkas itu pada 360, 768, dan 1280 px.

### 10.1 Welcome (`/`)

Berkas acuan: `docs/ui-reference/welcome.html`

1. **Baris atas**: wordmark (kotak `violet` 40 px berisi ikon `Sparkle` + "snapme" Unbounded 900 24 px), tautan "Privasi", tombol `primary sm` "Mulai Foto".
2. **Panel hero** (`paper`, `shadow-hard-lg`), dengan pita papan catur di tepi atas. Dua kolom yang menumpuk di layar sempit:
   - Kiri: chip "Photobooth di browser", judul `display-xl` "Foto strip tanpa antre.", satu paragraf (maksimal 20 kata), dua tombol `lg`: `primary` "Mulai Foto" dan `secondary` "Pakai Foto Galeri". Tidak ada elemen teks lain di hero.
   - Kanan: bidang `violet-soft` bergaris 3 px, berisi dua strip contoh yang dimiringkan (-5 dan 4 derajat) dan satu label miring "Tanpa akun".
3. **"Tiga cara baru buat foto bareng"**: tiga ubin dengan lebar 2 : 1 : 1, bukan tiga kartu sama lebar.
   - Gesture Snap: ubin `ink`, `shadow-hard-violet`, chip "Interaktif", judul `lime`, dan tiga baris legenda gesture.
   - Strip Estafet: ubin `violet-soft`, ikon `Users`, diagram empat slot (dua terisi, dua putus-putus).
   - Strip Hidup: ubin `paper`, ikon `FilmStrip`.
4. **"Dari kamera sampai cetak"**: panel berisi empat pil berurutan dengan panah. Pil terakhir `lime`. Tanpa label "Langkah 1".
5. **Kaki**: ikon gembok dan satu kalimat privasi.

### 10.2 Ambil Foto (`/booth/capture`)

Berkas acuan: `docs/ui-reference/capture.html`

Booth Shell dengan stepper di "Foto".

- **Kepala panel**: kembali, judul "AMBIL FOTO", chip layout ("Strip 4 foto"), di kanan: sakelar "Gesture Snap" dengan chip "Nyala" atau "Mati", lalu pil penghitung `pink` "2/4" (`aria-live="polite"`).
- **Rel kiri "FOTOMU"**: `ShotTray` dan tombol `neutral sm` "Ulang foto terakhir".
- **Tengah**: `CameraStage` dengan `GestureHUD` di atas, `CountdownOverlay` di tengah, `ShutterButton` dan chip pintasan "Spasi" di bawah. Di bawah area kamera: satu baris privasi dengan ikon gembok.
- **Rel kanan**: kartu `lime` "Senyum, kamera siap!" berisi legenda tiga gesture, `RelayInviteCard`, lalu aksi utama "Lanjut Hias" di dasar rel. Aksi utama nonaktif sampai semua slot terisi, dengan teks bantu "Butuh 2 foto lagi."

Urutan keadaan: siap, menahan gesture (0,8 detik), hitung mundur 3, 2, 1, kilat, slot terisi, jeda, siap lagi. Setelah slot terakhir: HUD "4 foto siap dihias" dan aksi utama menyala.

Di bawah 768 px area kamera menjadi persegi, HUD merapat ke atas, dan chip pintasan "Spasi" disembunyikan.

### 10.3 Hias Strip (`/booth/customize`)

Berkas acuan: `docs/ui-reference/customize.html`

Booth Shell dengan stepper di "Hias".

- **Kepala panel**: kembali, judul "HIAS STRIP", di kanan chip `lime` "4 foto siap".
- **Rel kiri**: tab pil "Frame", "Efek", "Stiker". Isi tab berupa kisi 3 kolom: swatch frame (rasio 2 : 3, nama di bawahnya), swatch efek (persegi), tombol stiker (persegi `radius-card`). Yang terpilih memakai pola "Swatch terpilih".
- **Tengah**: `StripCanvas` di atas bidang `cream`, stiker tertempel melewati tepi strip, dan satu baris `label` "Ekspor 600 x 1800 px (2 x 6 inci, 300 dpi)".
- **Rel kanan**: kartu "Strip Hidup" dengan sakelar, kartu "QR di strip" dengan sakelar dan pemberitahuan izin unggah saat menyala, ringkasan (Frame, Efek, Stiker), lalu aksi utama "Selesai & Unduh" dan tombol `neutral` "Cetak 4R".

Halaman lain (Pilih layout, Hasil, `/s/{id}`, `/r/{id}`) disusun dari Booth Shell dan komponen yang sama. Bila butuh pola baru, tambahkan dulu ke dokumen ini.

## 11. Aksesibilitas

- Target WCAG 2.2 AA. Pasangan warna hanya dari tabel §2.
- Seluruh alur selesai dengan keyboard: Tab mengikuti urutan visual, Spasi mengambil foto saat fokus di area kamera, Esc menutup dialog dan lembar.
- Kanvas hias tidak terbaca pembaca layar, jadi sediakan padanan daftar: tiap stiker dan teks muncul sebagai baris dengan tombol pindah (panah, langkah 8 px), perbesar, perkecil, putar, hapus.
- Hitung mundur dan penghitung foto diumumkan lewat `aria-live`. HUD gesture memakai `role="status"`.
- Sakelar dan tab memakai elemen `button` asli dengan `aria-pressed` atau komponen Radix yang setara.
- Kilat foto: satu kali per foto, tidak pernah berulang cepat.
- Tidak ada informasi yang hanya disampaikan lewat gesture, warna, atau suara.

## 12. Suara dan teks antarmuka

Santai, langsung, tanpa basa-basi. Kalimat lengkap pendek. Tanpa emoji, tanpa em dash, tanpa tanda seru beruntun.

| Maksud | Label tetap |
|---|---|
| Mulai sesi | Mulai Foto |
| Pakai foto yang sudah ada | Pakai Foto Galeri |
| Ke langkah hias | Lanjut Hias |
| Selesai dan unduh | Selesai & Unduh |
| Cetak | Cetak 4R |
| Estafet | Estafet ke Teman |
| Ulang | Ulang foto terakhir |
| Izin kamera | Izinkan Kamera |
| Hapus sesi | Mulai dari awal |

Pesan galat menyebut apa yang terjadi dan apa yang bisa dilakukan, misalnya: "Kamera belum diizinkan. Buka pengaturan situs di browser, izinkan kamera, lalu muat ulang." Jangan menyalahkan pengguna dan jangan menampilkan kode galat mentah.

## 13. Token untuk Tailwind v4 dan shadcn/ui

Letakkan di `src/app/globals.css`. Nilai mentah hanya boleh muncul di berkas ini: komponen memakai nama token.

```css
@import "tailwindcss";

@theme {
  --color-ink: #141414;
  --color-paper: #FFFDF7;
  --color-cream: #F4F1E6;
  --color-lime: #C3F53C;
  --color-tangerine: #F0562B;
  --color-violet: #5038D6;
  --color-violet-soft: #A9A4F4;
  --color-pink: #F2479B;
  --color-pink-700: #CF1874;
  --color-muted: #5E5E57;
  --color-danger: #B42318;

  --font-display: var(--font-unbounded), sans-serif;
  --font-sans: var(--font-space-grotesk), sans-serif;
  --font-mono: var(--font-space-mono), monospace;

  --radius-panel: 20px;
  --radius-stage: 16px;
  --radius-card: 14px;
  --radius-thumb: 10px;
  --radius-pill: 999px;

  --shadow-hard-sm: 3px 3px 0 var(--color-ink);
  --shadow-hard: 4px 4px 0 var(--color-ink);
  --shadow-hard-lg: 6px 6px 0 var(--color-ink);
  --shadow-hard-violet: 6px 6px 0 var(--color-violet);

  --ease-snap: cubic-bezier(0.16, 1, 0.3, 1);
}

:root {
  /* pemetaan variabel semantik shadcn/ui */
  --background: var(--color-lime);
  --foreground: var(--color-ink);
  --card: var(--color-paper);
  --card-foreground: var(--color-ink);
  --popover: var(--color-paper);
  --popover-foreground: var(--color-ink);
  --primary: var(--color-tangerine);
  --primary-foreground: var(--color-ink);
  --secondary: var(--color-violet);
  --secondary-foreground: var(--color-paper);
  --muted: var(--color-cream);
  --muted-foreground: var(--color-muted);
  --accent: var(--color-lime);
  --accent-foreground: var(--color-ink);
  --destructive: var(--color-danger);
  --border: var(--color-ink);
  --input: var(--color-ink);
  --ring: var(--color-violet);
  --radius: 14px;
}
```

Susunan pasti berkas ini mengikuti keluaran `npx shadcn@latest init` pada versi yang terpasang: pertahankan strukturnya, ganti nilainya.

## 14. Daftar periksa tinjauan UI

Dipakai peninjau sebelum sebuah halaman dianggap selesai:

- [ ] Komponen berasal dari dasar di §9, bukan tulisan sendiri yang menduplikasi library.
- [ ] Tidak ada nilai warna, radius, atau bayangan mentah di luar `globals.css`.
- [ ] Tepat satu aksi `primary` terlihat per layar.
- [ ] Semua pasangan teks dan latar ada di tabel §2.
- [ ] Keadaan memuat, kosong, galat, dan nonaktif tersedia.
- [ ] Bisa dipakai dengan keyboard, cincin fokus terlihat di setiap permukaan.
- [ ] `prefers-reduced-motion` dihormati.
- [ ] Rapi pada 360, 768, dan 1280 px, dan sudah dibandingkan berdampingan dengan berkas acuannya di `docs/ui-reference/` bila ada.
- [ ] Label mengikuti §12, tanpa emoji dan tanpa em dash.
