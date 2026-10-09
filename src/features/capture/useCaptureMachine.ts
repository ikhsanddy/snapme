"use client"

import { useEffect, useReducer } from "react"

import { allFilled, useBoothStore } from "@/stores/booth"

import {
  COUNTDOWN_STEP_MS,
  FLASH_MS,
  INITIAL_CAPTURE_STATE,
  PAUSE_MS,
  reduce,
  type CaptureEvent,
  type CaptureState,
} from "./machine"

/* ARCHITECTURE §5: timer yang menggerakkan mesin keadaan.
   Satu detik per angka hitung mundur; jeda singkat setelah jepret supaya
   indikator tidak langsung siap lagi (dipakai gesture di M3); kilat 160 ms.
   Setiap timer membaca store saat berbunyi, jadi nilainya selalu segar. */
export function useCaptureMachine(): [CaptureState, (event: CaptureEvent) => void] {
  const [state, dispatch] = useReducer(reduce, INITIAL_CAPTURE_STATE)
  const { phase, countdownValue, flash } = state

  useEffect(() => {
    if (phase === "countdown") {
      const timer = setTimeout(() => dispatch({ type: "TICK" }), COUNTDOWN_STEP_MS)
      return () => clearTimeout(timer)
    }
    if (phase === "pause") {
      const timer = setTimeout(
        () =>
          dispatch({
            type: "PAUSE_DONE",
            allFilled: allFilled(useBoothStore.getState().shots),
          }),
        PAUSE_MS
      )
      return () => clearTimeout(timer)
    }
  }, [phase, countdownValue])

  /* Timer kilat terpisah: fase berganti lebih dulu dari kilatnya, jadi efek ini
     tidak boleh ikut dibersihkan saat fase berubah. */
  useEffect(() => {
    if (!flash) {
      return
    }
    const timer = setTimeout(() => dispatch({ type: "FLASH_DONE" }), FLASH_MS)
    return () => clearTimeout(timer)
  }, [flash])

  return [state, dispatch]
}
