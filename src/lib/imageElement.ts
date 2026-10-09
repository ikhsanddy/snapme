/* Elemen gambar dari dataURL atau URL berkas. Dipakai jalur ekspor (rekompresi
   JPEG) dan pemuatan foto galeri; keduanya berakhir di kanvas 2D. */

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  const { promise, resolve, reject } = Promise.withResolvers<HTMLImageElement>()
  const image = new window.Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error("Gambar tidak bisa dimuat"))
  image.src = src
  return promise
}
