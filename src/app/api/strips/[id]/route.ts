/* Backend Cloudflare (D1/R2/KV) sudah dibongkar, jadi rute ini tinggal menjaga
   kontrak lama: klien mengharapkan 503 "belum tersedia" dan menampilkan
   pesannya, bukan 404. */

const UNAVAILABLE = { error: "Penghapusan link belum tersedia." }

export async function DELETE() {
  return Response.json(UNAVAILABLE, { status: 503 })
}
