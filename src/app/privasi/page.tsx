import type { Metadata } from "next"
import { Lock } from "@phosphor-icons/react/ssr"

import { SiteHeader } from "@/components/site/SiteHeader"

/* FR-15: halaman Privasi. Komponen server, statis. */
export const metadata: Metadata = { title: "Privasi | snapme" }

const BAGIAN = [
  {
    judul: "Diproses di perangkatmu",
    isi: "Kamera, deteksi gesture, penghiasan strip, dan ekspor PNG berjalan di perangkatmu. Selama memotret dan menghias, foto tidak dikirim ke server mana pun.",
  },
  {
    judul: "Kapan foto diunggah",
    isi: "Foto hanya meninggalkan perangkatmu kalau kamu sendiri membuat link strip atau mengundang teman lewat Strip Estafet. Sebelum mengunggah, snapme selalu meminta persetujuan dan menampilkan isi yang akan dikirim.",
  },
  {
    judul: "Masa simpan",
    isi: "Link strip pribadi aktif 7 hari. Link estafet aktif 48 jam, dan strip estafet terhapus 7 hari setelah selesai. Lewat dari itu, berkas terhapus otomatis.",
  },
  {
    judul: "Cara menghapus",
    isi: "Pembuat strip bisa menghapus dari halaman stripnya kapan saja. Estafet bisa dibatalkan dan dihapus pembuatnya. Foto yang belum dibagikan hilang begitu sesi ditutup.",
  },
]

export default function PrivasiPage() {
  return (
    <div className="stage-grid flex min-h-dvh flex-1 flex-col">
      <div className="page-container flex flex-1 flex-col gap-6 py-6">
        <SiteHeader ctaVariant="primary" />

        <main className="flex flex-col gap-6 rounded-panel border-3 border-ink bg-paper p-6 shadow-hard-lg">
          <h1 className="heading text-ink">Privasi</h1>

          <p className="max-w-[65ch] text-lg leading-[1.5]">
            snapme memproses foto di perangkatmu. Halaman ini menjelaskan apa
            yang berjalan lokal, kapan sesuatu diunggah, berapa lama disimpan,
            dan cara menghapusnya.
          </p>

          {BAGIAN.map((bagian) => (
            <section key={bagian.judul} className="flex flex-col gap-2">
              <h2 className="title text-ink">{bagian.judul}</h2>
              <p className="max-w-[65ch] text-base leading-[1.5]">{bagian.isi}</p>
            </section>
          ))}

          <footer className="flex flex-wrap items-center gap-3 border-t-3 border-ink pt-5">
            <Lock weight="bold" className="size-[22px]" aria-hidden />
            <p className="max-w-[65ch] flex-[1_1_320px] text-[15px] leading-[1.5]">
              Foto wajah adalah data pribadi. snapme mengikuti semangat UU No. 27
              Tahun 2022 tentang Pelindungan Data Pribadi.
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
