import { openDB, type DBSchema, type IDBPDatabase } from "idb"

import { LAYOUTS, type LayoutId } from "@/lib/layouts"
import type { Shot, StickerInstance, StripText } from "@/stores/booth"

/* FR-14: sesi bertahan saat halaman dimuat ulang. Hanya state yang perlu
   dipulihkan yang disimpan; pengaturan perangkat punya jalurnya sendiri
   (gesture GS-06 di localStorage, kamera memang sesi saja). IndexedDB dipakai
   lewat `idb` (ARCHITECTURE §2: klien penyimpanan tidak ditulis sendiri).
   Nilai yang dibaca kembali divalidasi lebih dulu, jadi rekaman dari versi
   lain atau yang rusak tidak pernah masuk ke store. */

export const SESSION_VERSION = 1
const DB_NAME = "snapme-session"
const STORE = "state"
const KEY = "current"

export interface SessionRecord {
  version: typeof SESSION_VERSION
  layoutId: LayoutId | null
  shots: (Shot | null)[]
  frameId: string
  effectId: string
  stickers: StickerInstance[]
  texts: StripText[]
  showDate: boolean
}

/** Bagian state sesi yang disimpan. `settings` dan `sessionReady` bukan milik
 *  rekaman. */
export type SessionState = Pick<
  SessionRecord,
  | "layoutId"
  | "shots"
  | "frameId"
  | "effectId"
  | "stickers"
  | "texts"
  | "showDate"
>

interface SessionDb extends DBSchema {
  state: { key: string; value: SessionRecord }
}

let dbPromise: Promise<IDBPDatabase<SessionDb>> | null = null

function openSessionDb(): Promise<IDBPDatabase<SessionDb>> {
  dbPromise ??= openDB<SessionDb>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE)
    },
  })
  return dbPromise
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isShot(value: unknown): value is Shot {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const shot = value as Record<string, unknown>
  return typeof shot.still === "string" && isNumber(shot.capturedAt)
}

function isSticker(value: unknown): value is StickerInstance {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const sticker = value as Record<string, unknown>
  return (
    typeof sticker.id === "string" &&
    typeof sticker.assetId === "string" &&
    isNumber(sticker.x) &&
    isNumber(sticker.y) &&
    isNumber(sticker.rotation) &&
    isNumber(sticker.width)
  )
}

function isText(value: unknown): value is StripText {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const text = value as Record<string, unknown>
  return (
    typeof text.id === "string" &&
    typeof text.value === "string" &&
    isNumber(text.x) &&
    isNumber(text.y) &&
    isNumber(text.rotation) &&
    isNumber(text.fontSize)
  )
}

export function serializeSession(state: SessionState): SessionRecord {
  return {
    version: SESSION_VERSION,
    layoutId: state.layoutId,
    shots: state.shots,
    frameId: state.frameId,
    effectId: state.effectId,
    stickers: state.stickers,
    texts: state.texts,
    showDate: state.showDate,
  }
}

/** Menerima hanya rekaman versi ini dengan bentuk yang benar; selain itu null,
 *  dan pemanggil membuang rekamannya. */
export function validateRecord(value: unknown): SessionRecord | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  const record = value as Record<string, unknown>
  if (record.version !== SESSION_VERSION) {
    return null
  }

  const { layoutId } = record
  if (
    layoutId !== null &&
    (typeof layoutId !== "string" || !(layoutId in LAYOUTS))
  ) {
    return null
  }
  /* Invarian store: jumlah slot selalu sama dengan shotCount layout terpilih. */
  const expectedShots =
    layoutId === null ? 0 : LAYOUTS[layoutId as LayoutId].shotCount
  if (
    !Array.isArray(record.shots) ||
    record.shots.length !== expectedShots ||
    !record.shots.every((shot) => shot === null || isShot(shot))
  ) {
    return null
  }

  if (typeof record.frameId !== "string" || typeof record.effectId !== "string") {
    return null
  }
  if (
    !Array.isArray(record.stickers) ||
    !record.stickers.every(isSticker) ||
    !Array.isArray(record.texts) ||
    !record.texts.every(isText)
  ) {
    return null
  }
  if (typeof record.showDate !== "boolean") {
    return null
  }

  return {
    version: SESSION_VERSION,
    layoutId: layoutId as LayoutId | null,
    shots: record.shots as (Shot | null)[],
    frameId: record.frameId,
    effectId: record.effectId,
    stickers: record.stickers as StickerInstance[],
    texts: record.texts as StripText[],
    showDate: record.showDate,
  }
}

export async function loadSession(): Promise<unknown> {
  try {
    return await (await openSessionDb()).get(STORE, KEY)
  } catch {
    /* Mode privat atau IndexedDB diblokir: sesi tetap jalan di memori. */
    return null
  }
}

export async function saveSession(record: SessionRecord): Promise<void> {
  try {
    await (await openSessionDb()).put(STORE, record, KEY)
  } catch {
    /* Tanpa penyimpanan, sesi hanya tidak pulih setelah muat ulang. */
  }
}

export async function clearSession(): Promise<void> {
  try {
    await (await openSessionDb()).delete(STORE, KEY)
  } catch {
    /* Tidak ada yang bisa dihapus. */
  }
}
