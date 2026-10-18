"use client"

/* M8 (SE-03): membagikan link estafet. Web Share API dipakai bila ada (HP
   hampir selalu punya; desktop Chromium headless tidak), dan salin ke papan
   klip menjadi cadangannya. Pemanggil yang menerjemahkan hasilnya menjadi
   pesan di antarmuka. */

type ShareOutcome = "shared" | "copied" | "failed"

export async function shareLink(
  url: string,
  title: string
): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && navigator.canShare?.({ url }) === true) {
    try {
      await navigator.share({ url, title })
      return "shared"
    } catch {
      /* Batal dibagikan bukan kegagalan: pemanggil tidak perlu mengeluh. */
      return "failed"
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return "copied"
  } catch {
    return "failed"
  }
}
