/* PRD §4: pengukuran memakai analitik tanpa cookie dan tanpa data pribadi,
   hanya hitungan peristiwa. Daftar ini tertutup dan dipakai klien maupun
   server (src/lib/analytics.ts dan rute /api/events), supaya tidak ada nama
   bebas yang bisa masuk basis data.

   Pemetaannya ke ukuran PRD §4:
   - "Alur dasar selesai tanpa bantuan": camera_granted -> download_png.
   - "Gesture Snap benar-benar dipakai": photo_taken_gesture dibanding
     photo_taken_gesture + photo_taken_button.
   - "Estafet tuntas": relay_completed dibanding relay_created.
   - "Strip Hidup menambah nilai": live_enabled dibanding customize_reached.
   - "Cepat dipakai": bucket first_photo_* dari penanda waktu sesi.

   Kueri SQL untuk lima rasio itu ada di docs/DECISIONS.md (M9). */

export const EVENT_NAMES = [
  "welcome_loaded",
  "camera_granted",
  "camera_denied",
  "first_photo_under_15s",
  "first_photo_15_30s",
  "first_photo_30_60s",
  "first_photo_over_60s",
  "photo_taken_button",
  "photo_taken_gesture",
  "customize_reached",
  "live_enabled",
  "strip_link_created",
  "relay_created",
  "relay_completed",
  "download_png",
  "print_4r",
] as const

export type AnalyticsEvent = (typeof EVENT_NAMES)[number]

/** Batas satu permintaan beacon; antrean klien mengirim jauh di bawah ini. */
export const EVENT_BATCH_MAX = 20

/** Antrean klien dikirim begitu mencapai jumlah ini, selain saat halaman
 *  disembunyikan atau ditinggalkan. */
export const EVENT_BATCH_SIZE = 8

/** Penanda waktu awal sesi (dimulai saat Welcome dimuat). Namanya berawalan
 *  snapme supaya tidak bertabrakan dengan kunci lain di sessionStorage. */
export const SESSION_START_KEY = "snapme:t0"

/** Bucket durasi Welcome sampai foto pertama (PRD §4: median di bawah 30
 *  detik). Ambangnya di sini, bukan di tempat pemanggil, supaya batas 15, 30,
 *  dan 60 detik hanya ditulis sekali. */
export function firstPhotoBucket(ms: number): AnalyticsEvent {
  if (ms < 15_000) {
    return "first_photo_under_15s"
  }
  if (ms < 30_000) {
    return "first_photo_15_30s"
  }
  if (ms < 60_000) {
    return "first_photo_30_60s"
  }
  return "first_photo_over_60s"
}
