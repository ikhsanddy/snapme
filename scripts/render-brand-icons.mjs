#!/usr/bin/env node
/* Menurunkan ikon raster dari lambang vektor (DESIGN-SYSTEM §8.1):
   src/app/apple-icon.png dan src/app/favicon.ico dari public/brand/snapme-mark.svg
   dan src/app/icon.svg. Jalankan `npm run brand:icons` setiap kali salah satu
   berkas SVG itu berubah, lalu commit hasilnya.

   Diturunkan lewat skrip, bukan digambar dua kali, supaya ukuran kecil tidak
   pernah menyimpang dari lambang besarnya. Berkas hasilnya tetap ikut di-commit
   (ukurannya beberapa kilobyte saja dan `next build` membacanya sebagai
   konvensi berkas `app/`), jadi pemasangan tidak bergantung pada sharp. */
import { readFileSync, writeFileSync } from "node:fs"

import sharp from "sharp"

const MARK = "public/brand/snapme-mark.svg"
/* Lambang untuk ukuran kecil: satu kartu saja, bukan kipas empat kartu
   (docs/DESIGN-SYSTEM.md §8.1). */
const ICON = "src/app/icon.svg"
const APPLE = "src/app/apple-icon.png"
const FAVICON = "src/app/favicon.ico"
const ICO_SIZES = [16, 32, 48]
const APPLE_SIZE = 180

/* Digambar pada 600 dpi (64 px x 600/72 = 533 px) lalu diperkecil: garis tepi
   3 px di dalam lambang tetap tajam setelah penskalaan turun. */
const DENSITY = 600

async function png(source, size) {
  return sharp(readFileSync(source), { density: DENSITY })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

/* ICO dengan muatan PNG (didukung Windows Vista ke atas dan semua peramban
   yang memasang favicon). Berkas lama dari `create-next-app` memakai muatan
   BMP dan jauh lebih besar untuk gambar yang sama. */
function ico(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = ikon
  header.writeUInt16LE(entries.length, 4)

  let offset = header.length + entries.length * 16
  const directory = Buffer.alloc(entries.length * 16)
  entries.forEach(({ size, data }, index) => {
    const at = index * 16
    directory.writeUInt8(size >= 256 ? 0 : size, at)
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1)
    directory.writeUInt8(0, at + 2) // jumlah warna palet: 0 untuk truecolor
    directory.writeUInt8(0, at + 3) // reserved
    directory.writeUInt16LE(1, at + 4) // bidang
    directory.writeUInt16LE(32, at + 6) // bit per piksel
    directory.writeUInt32LE(data.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += data.length
  })

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.data)])
}

const entries = []
for (const size of ICO_SIZES) {
  entries.push({ size, data: await png(ICON, size) })
}

writeFileSync(FAVICON, ico(entries))
writeFileSync(APPLE, await png(MARK, APPLE_SIZE))
console.log(`brand: ${FAVICON} (${ICO_SIZES.join(", ")} px), ${APPLE} (${APPLE_SIZE} px)`)
