import Image from "next/image"
import Link from "next/link"

/* DESIGN-SYSTEM §10.1: wordmark baris atas. Lambang §8.1 (ubin paper bergaris
   tepi ink berisi kartu foto), nama Unbounded 900. Lambangnya berkas SVG di
   `public/brand`, bukan gambar inline, supaya satu gambar dipakai bersama
   favicon dan aset merek lain (scripts/render-brand-icons.mjs). */
export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex w-fit items-center gap-2.5 rounded-thumb text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet"
    >
      {/* `alt` kosong: nama merek sudah ada sebagai teks di sebelahnya. */}
      <Image
        src="/brand/snapme-mark.svg"
        alt=""
        width={40}
        height={40}
        priority
        unoptimized
        className="size-10"
      />
      <span className="font-display text-2xl font-black tracking-[-0.02em]">
        snapme
      </span>
    </Link>
  )
}
