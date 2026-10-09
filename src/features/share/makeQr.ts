import { resolveTokenColor } from "@/features/editor/tokenColor"

/* SH-04: QR di kaki strip. Digambar 336 px lalu dipakai pada kotak 168 px
   (lib/layouts.ts), jadi modulnya tetap tajam saat dicetak 300 dpi. Warna
   diambil dari token (DESIGN-SYSTEM §14), dan `qrcode` dimuat dengan import()
   dinamis supaya hanya ikut bundel langkah yang memakainya.

   Tingkat koreksi galat M dengan margin 2 modul: cukup untuk cetakan yang
   sedikit kotor, tanpa membengkakkan modul sampai sulit dipindai pada 168 px. */

const QR_RENDER_PX = 336
/* Empat modul, sesuai spec QR: zona tenang ikut masuk ke dalam kotak 168 px
   supaya kode tetap terbaca di atas latar frame gelap (frame "Malam"). */
const QR_QUIET_MODULES = 4

export async function makeQrDataUrl(text: string): Promise<string> {
  const QRCode = await import("qrcode")
  return QRCode.toDataURL(text, {
    width: QR_RENDER_PX,
    margin: QR_QUIET_MODULES,
    errorCorrectionLevel: "M",
    color: {
      dark: resolveTokenColor("--color-ink"),
      light: resolveTokenColor("--color-paper"),
    },
  })
}
