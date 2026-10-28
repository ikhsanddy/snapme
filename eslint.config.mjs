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
    // Berkas wasm MediaPipe yang disalin apa adanya ke public/ (ARCHITECTURE §4).
    "public/mediapipe/**",
    // Keluaran /brag: komposisi Hyperframes dan pustaka vendornya (gsap.min.js),
    // berkas jadi seperti keluaran build. Isinya tidak ikut git (.gitignore).
    "brag/**",
    "brag-output*/**",
  ]),
]);

export default eslintConfig;
