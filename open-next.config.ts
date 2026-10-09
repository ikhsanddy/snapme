import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/* M10: tanpa cache tambahan. Welcome statis, `/s` dan `/r` dinamis, jadi tidak
   ada ISR yang butuh R2/KV cache override. */
export default defineCloudflareConfig();
