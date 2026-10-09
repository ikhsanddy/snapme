// Berkas keluaran build OpenNext (`.open-next/worker.js`) baru ada setelah
// `opennextjs-cloudflare build`, jadi impornya sengaja dibiarkan lewat
// `@ts-ignore`: `@ts-expect-error` akan gagal justru setelah build pertama.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore dihasilkan saat build OpenNext
import { default as handler } from "./.open-next/worker.js";
import { purgeExpired } from "./src/lib/purge";

/* M10: Worker kustom OpenNext. `fetch` ditangani keluaran build OpenNext,
   sedangkan Cron Trigger memanggil `scheduled` langsung di sini, tanpa HTTP
   dan tanpa rahasia bersama. Rute `GET /api/cron/purge` tetap ada untuk
   pemicu manual. */
export default {
  fetch: handler.fetch,
  async scheduled(_event, env) {
    await purgeExpired(env.DB, env.BUCKET, new Date());
  },
} satisfies ExportedHandler<CloudflareEnv>;
