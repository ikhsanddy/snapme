import {
  EVENT_BATCH_SIZE,
  SESSION_START_KEY,
  firstPhotoBucket,
  type AnalyticsEvent,
} from "@/lib/analyticsEvents"

/* PRD §4 dan ARCHITECTURE §8: analitik first-party, tanpa pustaka pihak
   ketiga. Antreannya di memori dan pengirimannya best-effort lewat sendBeacon:
   saat halaman ditinggalkan, peristiwanya ikut terbang bersama beacon yang
   sudah diserahkan ke browser. Tidak ada retry dan tidak ada cookie; kalau
   pengirimannya gagal, peristiwanya memang hilang. */

const ENDPOINT = "/api/events"

let queue: AnalyticsEvent[] = []
let listenersAttached = false

function flush(): void {
  if (queue.length === 0) {
    return
  }
  const body = JSON.stringify({ events: queue })
  queue = []
  /* sendBeacon adalah jalur utama: beacon yang sudah diserahkan ke browser
     tetap terkirim walau halamannya ditinggalkan. Blob bertipe
     application/json sekaligus memenuhi gate jenis isi rutenya. */
  if (typeof navigator.sendBeacon === "function") {
    try {
      if (
        navigator.sendBeacon(
          ENDPOINT,
          new Blob([body], { type: "application/json" })
        )
      ) {
        return
      }
    } catch {
      /* Beacon diblokir atau penuh: pakai fetch di bawah. */
    }
  }
  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {})
}

function attachListeners(): void {
  if (listenersAttached) {
    return
  }
  listenersAttached = true
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush()
    }
  })
  window.addEventListener("pagehide", flush)
}

/** Mencatat satu peristiwa. Best-effort: tidak pernah melempar, jadi pemanggil
 *  tidak perlu membungkusnya dengan try/catch (penyimpanan atau sendBeacon
 *  yang diblokir bukan urusan alur foto). */
export function track(event: AnalyticsEvent): void {
  try {
    queue.push(event)
    attachListeners()
    if (queue.length >= EVENT_BATCH_SIZE) {
      flush()
    }
  } catch {
    /* Diam: analitik tidak boleh mengganggu apa pun. */
  }
}

/** Bucket durasi Welcome sampai foto pertama dibanding penanda waktu sesi;
 *  null bila sesinya belum ditandai (mis. pengguna masuk langsung ke
 *  /booth/capture dari tautan) atau bila penyimpanan diblokir peramban. */
export function firstPhotoBucketEvent(): AnalyticsEvent | null {
  try {
    const started = Number(window.sessionStorage.getItem(SESSION_START_KEY))
    if (!Number.isFinite(started) || started <= 0) {
      return null
    }
    return firstPhotoBucket(Date.now() - started)
  } catch {
    /* Penyimpanan diblokir (kebijakan perusahaan, mode privat): analitiknya
       hilang, alur fotonya tidak boleh ikut hilang. */
    return null
  }
}

/** Menandai awal sesi untuk bucket "cepat dipakai" (PRD §4). Gagal menyimpan
 *  bukan urusan pengguna: penandanya saja yang tidak ada. */
export function markSessionStart(): void {
  try {
    window.sessionStorage.setItem(SESSION_START_KEY, String(Date.now()))
  } catch {
    /* Diam, sama seperti `track()`. */
  }
}
