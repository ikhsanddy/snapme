import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/* ARCHITECTURE §4 dan §8: Gesture Snap di-host sendiri, tanpa CDN. Berkas
   wasm-nya disalin dari paket yang versinya dikunci lockfile, bukan disimpan di
   git: enam berkas `node_modules/@mediapipe/tasks-vision/wasm/` (dua `.js` dan
   empat `.wasm`, sekitar 39 MB) tidak berubah antar versi paket, jadi
   menaruhnya di repo hanya menggandakan bobot klon tanpa menambah apa pun.

   Model gesture (`public/models/gesture_recognizer.task`) tetap di-commit: ia
   diunduh dari dokumentasi resmi Google dan tidak bisa dibuat ulang dari
   paket, jadi klon bersih harus tetap bisa menjalankan Gesture Snap luring.

   Idempoten: berkas tujuan yang ukurannya sama dengan sumber tidak disalin
   ulang, jadi `npm install` berulang tidak menyentuh mtime. Gagal dengan
   peringatan, bukan galat, bila paket MediaPipe tidak ada: tanpa paket itu,
   yang hilang hanyalah aset wasm, bukan seluruh pemasangan. */

const root = fileURLToPath(new URL("..", import.meta.url))
const sumber = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm")
const tujuan = path.join(root, "public", "mediapipe", "wasm")

if (!existsSync(sumber)) {
  console.warn(
    "copy-mediapipe-wasm: node_modules/@mediapipe/tasks-vision/wasm tidak ada, aset dilewati"
  )
  process.exit(0)
}

mkdirSync(tujuan, { recursive: true })

let disalin = 0
let dilewati = 0
for (const nama of readdirSync(sumber)) {
  const asal = path.join(sumber, nama)
  const akhir = path.join(tujuan, nama)
  if (!statSync(asal).isFile()) continue
  if (existsSync(akhir) && statSync(akhir).size === statSync(asal).size) {
    dilewati += 1
    continue
  }
  copyFileSync(asal, akhir)
  disalin += 1
}

console.log(
  `copy-mediapipe-wasm: ${disalin} berkas disalin, ${dilewati} sudah ada di public/mediapipe/wasm`
)
