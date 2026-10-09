import { openDB, type DBSchema, type IDBPDatabase } from "idb"

import { LAYOUTS, type LayoutId } from "@/lib/layouts"
import type {
  RelaySession,
  ShareState,
  Shot,
  StickerInstance,
  StripText,
} from "@/stores/booth"

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
  /** M6: pilihan QR dan id link. Token hapus sengaja tidak ikut; ia tinggal di
   *  localStorage (`features/share/stripToken.ts`), jadi rekaman ini tidak
   *  berisi rahasia. */
  share: ShareState
  /** M8: irisan estafet bila sesi ini milik estafet. Token tidak ikut, sama
   *  seperti token hapus: ia tinggal di perangkat (`features/relay/relayToken.ts`).
   *  Rekaman lama tanpa bidang ini tetap valid. */
  relay?: RelaySession | null
  /** M8 (SE-10): sesi lokal dari estafet yang sudah selesai; menetap supaya
   *  muat ulang tidak mengubahnya jadi sesi yang bisa mengunggah lagi. */
  localOnly?: boolean
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
  | "share"
  | "relay"
  | "localOnly"
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

/* Panjang id yang diterima: nanoid saat ini 12 karakter, dan rentang ini
   memberi ruang bila panjangnya berubah tanpa melemahkan pemeriksaan. */
const SHARE_ID_MIN = 8
const SHARE_ID_MAX = 32

function isShare(value: unknown): value is ShareState {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const share = value as Record<string, unknown>
  if (typeof share.qrEnabled !== "boolean") {
    return false
  }
  if (share.strip === null) {
    return true
  }
  if (typeof share.strip !== "object") {
    return false
  }
  const strip = share.strip as Record<string, unknown>
  if (
    typeof strip.id !== "string" ||
    strip.id.length < SHARE_ID_MIN ||
    strip.id.length > SHARE_ID_MAX
  ) {
    return false
  }
  return strip.expiresAt === null || typeof strip.expiresAt === "string"
}

function isRelay(value: unknown): value is RelaySession {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const relay = value as Record<string, unknown>
  if (
    typeof relay.id !== "string" ||
    relay.id.length < SHARE_ID_MIN ||
    relay.id.length > SHARE_ID_MAX
  ) {
    return false
  }
  if (relay.role !== "host" && relay.role !== "guest") {
    return false
  }
  return (
    Array.isArray(relay.lockedSlots) &&
    relay.lockedSlots.every((slot) => isNumber(slot) && Number.isInteger(slot)) &&
    typeof relay.ghostEnabled === "boolean"
  )
}

export function serializeSession(state: SessionState): SessionRecord {
  return {
    version: SESSION_VERSION,
    layoutId: state.layoutId,
    /* M7: bingkai Strip Hidup (`Shot.clip`) sengaja tidak ikut rekaman. Bentuk
       fotonya disalin ulang di sini supaya `ImageBitmap` tidak pernah menyentuh
       IndexedDB dan rekaman lama tetap valid. */
    shots: state.shots.map((shot) =>
      shot === null ? null : { still: shot.still, capturedAt: shot.capturedAt }
    ),
    frameId: state.frameId,
    effectId: state.effectId,
    stickers: state.stickers,
    texts: state.texts,
    showDate: state.showDate,
    share: state.share,
    relay: state.relay ?? null,
    localOnly: state.localOnly ?? false,
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
  /* Rekaman sebelum M6 tidak punya `share`; bentuknya diterima apa adanya
     dengan nilai awal, jadi versi rekaman tidak perlu dinaikkan. */
  const share = record.share
  if (share !== undefined && !isShare(share)) {
    return null
  }
  /* M8: rekaman sebelum estafet tidak punya `relay`; bentuknya diterima apa
     adanya dengan nilai null, jadi versi rekaman tidak perlu dinaikkan. */
  const relay = record.relay
  if (relay !== undefined && relay !== null && !isRelay(relay)) {
    return null
  }
  const { localOnly } = record
  if (localOnly !== undefined && typeof localOnly !== "boolean") {
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
    share: share === undefined ? { qrEnabled: false, strip: null } : share,
    relay: relay === undefined ? null : (relay as RelaySession | null),
    localOnly: localOnly === true,
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
