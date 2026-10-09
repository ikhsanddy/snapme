/* Kanvas butuh warna konkret, sedangkan token tetap satu sumber kebenaran
   (DESIGN-SYSTEM §14). Nilainya dibaca dari elemen akar saat dipakai, bukan
   disalin sebagai heks di kode. Tema terang saja pada v1, jadi nilainya tidak
   pernah berubah selama satu sesi. */

export function resolveTokenColor(token: string): string {
  return window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim()
}
