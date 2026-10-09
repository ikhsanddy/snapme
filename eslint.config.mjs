import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Keluaran build OpenNext dan tipe binding hasil `wrangler types`
    // (M10): keduanya berkas jadi, bukan kode yang disunting.
    ".open-next/**",
    "cloudflare-env.d.ts",
    // Bundel sementara `wrangler dev` di dalam repo.
    ".wrangler/**",
    // Berkas wasm MediaPipe yang disalin apa adanya ke public/ (ARCHITECTURE §4).
    "public/mediapipe/**",
  ]),
]);

export default eslintConfig;
