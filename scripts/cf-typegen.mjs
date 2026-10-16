import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

/* `cloudflare-env.d.ts` diturunkan dari `wrangler.jsonc` oleh `wrangler types`
   dan tidak di-commit (docs/DECISIONS.md): isinya besar (sekitar 625 KB, karena
   memuat seluruh katalog tipe runtime Cloudflare, termasuk Workers AI) dan
   sepenuhnya turunan, jadi menyimpannya di repo berarti menyimpan berkas jadi
   yang bisa basi.

   Skrip ini menjalankan pembuatannya dari `postinstall` supaya klon bersih
   langsung punya tipe binding untuk editor, `npm run typecheck`, dan
   `next build` (termasuk build OpenNext di `npm run preview`/`deploy`, yang
   memanggil Next sendiri). Bila `wrangler` tidak terpasang, misalnya pada
   `npm ci --omit=dev`, skrip berhenti dengan peringatan alih-alih menggagalkan
   pemasangan. */

const root = fileURLToPath(new URL("..", import.meta.url))
const cli = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js")

if (!existsSync(cli)) {
  console.warn(
    "cf-typegen: wrangler tidak terpasang, cloudflare-env.d.ts dilewati (jalankan `npm run cf-typegen` setelah wrangler ada)"
  )
  process.exit(0)
}

/* Dijalankan lewat `node <cli>` alih-alih `node_modules/.bin/wrangler`, supaya
   tidak perlu shell: dengan shell, spasi pada jalur proyek bisa memecah
   argumen. */
const hasil = spawnSync(
  process.execPath,
  [cli, "types", "--env-interface", "CloudflareEnv", "cloudflare-env.d.ts"],
  { cwd: root, stdio: "inherit" }
)

if (hasil.status !== 0) {
  console.error("cf-typegen: `wrangler types` gagal")
  process.exit(hasil.status ?? 1)
}

console.log("cf-typegen: cloudflare-env.d.ts dibuat ulang dari wrangler.jsonc")
