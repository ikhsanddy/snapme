/* Titik masuk tunggal untuk penggabung kelas. Paket `cn` yang dipakai; berkas
   ini ada karena `components.json` menunjuk `@/lib/utils` sebagai alias
   (komponen yang ditambah lewat `shadcn add` selalu mengimpor dari sini), jadi
   setiap komponen di `src/components/ui` juga mengimpor dari sini, bukan dari
   paketnya langsung. */
export { cn } from "cn"
