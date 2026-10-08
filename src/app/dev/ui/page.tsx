"use client"

import * as React from "react"
import { Camera, Check, SpinnerGap } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Toaster } from "@/components/ui/sonner"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-5 rounded-panel border-3 border-ink bg-paper p-5 shadow-hard">
        {children}
      </div>
    </section>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

function SwitchRow() {
  const [on, setOn] = React.useState(true)

  return (
    <Row label="Bawaan, hidup, dan mati">
      <div className="flex items-center gap-3">
        <Switch checked={on} onCheckedChange={setOn} id="gesture" />
        <span className="font-mono text-xs font-bold uppercase">
          {on ? "Nyala" : "Mati"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked disabled />
        <span className="font-mono text-xs font-bold uppercase">Nyala</span>
      </div>
    </Row>
  )
}

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm">
        Hanya saat pengembangan.
      </main>
    )
  }

  return (
    <main className="stage-grid min-h-dvh">
      <Toaster />
      <TooltipProvider>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-10 sm:px-6 lg:px-10">
          <header className="flex flex-col gap-2">
            <p className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
              M0 Fondasi
            </p>
            <h1 className="font-display text-2xl font-black">
              Galeri komponen
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Bandingkan dengan berkas acuan di docs/ui-reference. Arahkan
              kursor dan tekan Tab untuk melihat keadaan hover, fokus, dan
              aktif.
            </p>
          </header>

          <Section title="Tombol">
            <Row label="Varian">
              <Button>Mulai Foto</Button>
              <Button variant="secondary">Pakai Foto Galeri</Button>
              <Button variant="neutral">Cetak 4R</Button>
              <Button variant="ghost">Ulang foto terakhir</Button>
            </Row>
            <Row label="Ukuran, termasuk tombol ikon 44 px dan 56 px">
              <Button size="sm">Ambil Foto</Button>
              <Button size="lg">Lanjut Hias</Button>
              <Button size="icon" aria-label="Ambil foto">
                <Camera weight="bold" className="size-6" />
              </Button>
              <Button size="icon-lg" aria-label="Ambil foto">
                <Camera weight="bold" className="size-7" />
              </Button>
            </Row>
            <Row label="Nonaktif">
              <Button disabled>Lanjut Hias</Button>
              <span className="text-sm text-muted-foreground">
                Butuh 2 foto lagi.
              </span>
            </Row>
            <Row label="Memuat">
              <Button disabled aria-busy="true">
                <SpinnerGap weight="bold" className="size-5 animate-spin" />
                Menyiapkan gesture
              </Button>
            </Row>
          </Section>

          <Section title="Chip">
            <Row label="Netral, positif, penghitung, dan lencana centang">
              <Badge>Photobooth di browser</Badge>
              <Badge variant="lime">4 foto siap</Badge>
              <Badge variant="pink">2/4</Badge>
              <Badge variant="lime">
                <Check weight="bold" />
                Terpilih
              </Badge>
            </Row>
          </Section>

          <Section title="Kartu">
            <Row label="Bawaan">
              <Card className="w-full max-w-sm">
                <CardHeader>
                  <CardTitle>Strip Estafet</CardTitle>
                  <CardDescription>
                    Cukup ambil 2 foto. Sisanya diisi temanmu lewat link.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  Strip 4 foto, 2 slot milikmu dan 2 slot milik teman.
                </CardContent>
                <CardFooter className="gap-3">
                  <Button variant="secondary" size="sm">
                    Estafet ke Teman
                  </Button>
                </CardFooter>
              </Card>
            </Row>
          </Section>

          <Section title="Swatch terpilih">
            <Row label="Cincin violet dengan lencana centang">
              <button
                type="button"
                aria-pressed="true"
                aria-label="Frame Lime, terpilih"
                className="relative size-16 rounded-thumb border-2 border-ink bg-lime ring-3 ring-violet ring-offset-3 ring-offset-paper focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet"
              >
                <Badge
                  variant="lime"
                  className="absolute -top-3 -right-4 px-1.5 py-0.5"
                >
                  <Check weight="bold" />
                </Badge>
              </button>
              <button
                type="button"
                aria-pressed="false"
                aria-label="Frame Krim"
                className="size-16 rounded-thumb border-2 border-ink bg-cream focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-violet"
              />
            </Row>
          </Section>

          <Section title="Sakelar">
            <SwitchRow />
          </Section>

          <Section title="Tab pil">
            <Row label="Terpilih dan berpindah">
              <Tabs defaultValue="frame" className="w-full max-w-md">
                <TabsList>
                  <TabsTrigger value="frame">Frame</TabsTrigger>
                  <TabsTrigger value="efek">Efek</TabsTrigger>
                  <TabsTrigger value="stiker">Stiker</TabsTrigger>
                </TabsList>
                <TabsContent value="frame" className="text-sm">
                  Enam frame, masing-masing dengan nama di bawah swatch.
                </TabsContent>
                <TabsContent value="efek" className="text-sm">
                  Enam efek foto dari filter bawaan Konva.
                </TabsContent>
                <TabsContent value="stiker" className="text-sm">
                  Dua belas stiker, bisa digeser, diputar, dan diubah ukuran.
                </TabsContent>
              </Tabs>
            </Row>
            <Row label="Toggle group, satu pilihan">
              <ToggleGroup type="single" defaultValue="frame">
                <ToggleGroupItem value="frame">Frame</ToggleGroupItem>
                <ToggleGroupItem value="efek">Efek</ToggleGroupItem>
                <ToggleGroupItem value="stiker">Stiker</ToggleGroupItem>
              </ToggleGroup>
            </Row>
          </Section>

          <Section title="Slider">
            <Row label="Bawaan dan nonaktif">
              <Slider defaultValue={[40]} className="max-w-xs" />
              <Slider defaultValue={[20]} disabled className="max-w-xs" />
            </Row>
          </Section>

          <Section title="Dialog">
            <Row label="Terbuka saat diklik, Esc menutup">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Izinkan Kamera</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Unggah strip?</DialogTitle>
                    <DialogDescription>
                      Strip diunggah ke server supaya bisa dibuka lewat link.
                      Link kedaluwarsa 7 hari.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="neutral">Batal</Button>
                    <Button>Unggah</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Row>
          </Section>

          <Section title="Lembar bawah">
            <Row label="Untuk pilihan hias di layar sempit">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="secondary">Pilih frame</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Frame</DrawerTitle>
                    <DrawerDescription>
                      Pilih satu frame untuk stripmu.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="grid grid-cols-3 gap-3 p-4">
                    {["Hitam", "Krem", "Pink"].map((name) => (
                      <div
                        key={name}
                        className="rounded-thumb border-2 border-ink bg-lime p-3 text-center text-sm font-bold"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                </DrawerContent>
              </Drawer>
            </Row>
          </Section>

          <Section title="Tooltip">
            <Row label="Muncul saat kursor berhenti di atas tombol">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="neutral">Ulang foto terakhir</Button>
                </TooltipTrigger>
                <TooltipContent>Mengulang foto terakhir saja</TooltipContent>
              </Tooltip>
            </Row>
          </Section>

          <Section title="Toast">
            <Row label="Pesan sementara">
              <Button
                variant="neutral"
                onClick={() => toast.success("Link strip disalin")}
              >
                Tampilkan toast
              </Button>
              <Button
                variant="ghost"
                onClick={() => toast.error("Kamera belum diizinkan")}
              >
                Tampilkan galat
              </Button>
            </Row>
          </Section>

          <Section title="Skeleton">
            <Row label="Memuat, mengikuti bentuk akhir">
              <div className="flex w-full max-w-sm flex-col gap-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-11 w-32" />
              </div>
            </Row>
          </Section>

          <Section title="Carousel">
            <Row label="Daftar template di layar sempit">
              <div className="w-full max-w-md overflow-hidden px-12">
                <Carousel>
                  <CarouselContent>
                    {["Hitam", "Krem", "Pink", "Lime"].map((name) => (
                      <CarouselItem key={name} className="basis-1/2">
                        <div className="rounded-card border-2 border-ink bg-cream p-6 text-center font-display text-base font-extrabold">
                          {name}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
            </Row>
          </Section>
        </div>
      </TooltipProvider>
    </main>
  )
}
