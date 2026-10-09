"use client"

import { useEffect, useId, useRef, useState } from "react"
import { CaretDown, Check, VideoCamera } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* FR-08 (P1): pilih kamera bila perangkat punya lebih dari satu.
   Pola disclosure sederhana: tombol kepala panel + daftar tombol perangkat,
   jadi seluruh pemilih bisa dipakai keyboard tanpa komponen baru. */
export function CameraPicker({
  devices,
  selectedId,
  onSelect,
}: {
  devices: MediaDeviceInfo[]
  selectedId: string | null
  onSelect: (deviceId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) {
      return
    }
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  const selectedIndex = devices.findIndex(
    (device) => device.deviceId === selectedId
  )
  const selectedDevice = selectedIndex === -1 ? null : devices[selectedIndex]

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="neutral"
        size="sm"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <VideoCamera weight="bold" className="size-4" aria-hidden />
        <span className="max-w-40 truncate">
          {selectedDevice === null || selectedDevice.label === ""
            ? "Kamera otomatis"
            : selectedDevice.label}
        </span>
        <CaretDown weight="bold" className="size-4" aria-hidden />
      </Button>

      {open ? (
        <ul
          id={listId}
          className="absolute right-0 z-20 mt-2 flex w-64 flex-col gap-1 rounded-card border-2 border-ink bg-paper p-2 shadow-hard"
        >
          {devices.map((device, index) => {
            const label =
              device.label === "" ? `Kamera ${index + 1}` : device.label
            const selected = device.deviceId === selectedId

            return (
              <li key={device.deviceId}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(device.deviceId)
                    setOpen(false)
                  }}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-thumb px-2 py-2 text-left text-[15px] font-bold",
                    "hover:bg-cream focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-violet"
                  )}
                >
                  <Check
                    weight="bold"
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 text-violet",
                      selected ? undefined : "invisible"
                    )}
                  />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
