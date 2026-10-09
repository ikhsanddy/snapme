/* Id preset hias yang dipakai saat sesi dimulai. Berkas terpisah supaya
   `stores/booth.ts` tidak menarik seluruh data preset (enam frame, tujuh efek,
   dua belas stiker) ke bundel halaman yang tidak memakai kanvas. */

export const DEFAULT_FRAME_ID = "klasik"
export const DEFAULT_EFFECT_ID = "asli"
