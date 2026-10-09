import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

/* M10: tambalan kecil untuk @opennextjs/cloudflare 1.20.10.

   Adapter itu menyisipkan isi manifest Next ke bundel karena workerd tidak
   punya `readFileSync` (plugin `inline-load-manifest`). Daftar berkas yang
   disisipkan dibaca dari pola glob yang belum memuat `preview-props.json`;
   Next 16.4 menambah manifest itu dan memanggilnya saat server disusun, jadi
   tanpa tambalan ini setiap permintaan di Worker gagal dengan
   "Unexpected loadManifest(/.next/server/preview-props.json) call!".

   Skrip ini menambal pola glob-nya langsung di paket terpasang. Sifatnya:
   idempoten (aman dijalankan berkali-kali), gagal berisik bila polanya sudah
   berubah (artinya versi paket berbeda), dan boleh dihapus begitu upstream
   memuat `preview-props` di polanya. Dipanggil dari `postinstall` dan dari
   tiap skrip build Cloudflare. */

const TARGET = fileURLToPath(
  new URL(
    "../node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js",
    import.meta.url
  )
)
const SEBELUM = '"**/{*-manifest,required-server-files,prefetch-hints}.json"'
const SESUDAH =
  '"**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json"'

const isi = readFileSync(TARGET, "utf8")
if (isi.includes(SESUDAH)) {
  console.log("patch-opennext: pola sudah memuat preview-props, tidak ada yang dikerjakan")
  process.exit(0)
}
if (!isi.includes(SEBELUM)) {
  console.error(
    `patch-opennext: pola glob tidak ditemukan di ${TARGET}. Versi @opennextjs/cloudflare mungkin sudah ditambal upstream; periksa docs/DECISIONS.md M10 lalu hapus skrip ini.`
  )
  process.exit(1)
}
writeFileSync(TARGET, isi.replace(SEBELUM, SESUDAH))
console.log("patch-opennext: preview-props.json sekarang ikut disisipkan ke bundel")
