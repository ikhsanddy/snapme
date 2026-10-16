import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono, Unbounded } from "next/font/google";
import { DeferredToaster } from "@/components/ui/deferred-toaster";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  /* M9 menguji `display: "optional"` untuk mengejar LCP Welcome (PRD §8):
     hasilnya tidak berbeda (median 3,17 detik berbanding 3,16 detik) karena
     yang menahan LCP adalah biaya gambar judul hero plus rebutan lebar pita
     dengan bundel JS, bukan penggantian fonnya. Pengaturannya dikembalikan ke
     bawaan (`swap`) supaya tipografi merek tidak turun ke fon cadangan di
     kunjungan pertama yang lambat; selisih dan rencananya ada di
     docs/DECISIONS.md (M9). */
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "snapme",
  description:
    "Photobooth di browser: foto, hias strip, lalu unduh atau cetak. Tanpa akun.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${unbounded.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <DeferredToaster />
      </body>
    </html>
  );
}
