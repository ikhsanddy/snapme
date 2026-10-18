"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import type { Group as KonvaGroup } from "konva/lib/Group"
import type { Stage as KonvaStage } from "konva/lib/Stage"
import { Stage } from "react-konva"

import { StripStage } from "@/features/editor/StripStage"
import type { EffectParams, FramePreset } from "@/features/editor/presets"
import { CLIP_FRAME_COUNT } from "@/features/capture/clipRecorder"
import { getLayout, type LayoutId } from "@/lib/layouts"
import type { Shot, StickerInstance, StripText } from "@/stores/booth"

import { recordStripVideo, type RecordedLiveVideo } from "./recordStripVideo"

/* SH-03: panggung rekam di luar layar untuk versi hidup. Lebarnya 480 px
   (bingkai klip), jadi video yang dihasilkan ringan. Panggung ini tidak pernah
   menerima pilihan, dan lencana "Klip" tidak ikut terekam. */

const RECORD_WIDTH = 480
/* Dua putaran penuh: sekitar 3 detik (SH-03). */
const RECORD_LOOPS = 2

const IGNORE = () => {}

export interface LiveStageHandle {
  record(loops?: number): Promise<RecordedLiveVideo | null>
}

interface LiveStageProps {
  layoutId: LayoutId
  shots: (Shot | null)[]
  frame: FramePreset
  effect: EffectParams
  stickers: StickerInstance[]
  texts: StripText[]
  showDate: boolean
  qr?: { imageUrl: string | null }
}

export const LiveStage = forwardRef<LiveStageHandle, LiveStageProps>(
  function LiveStage({ layoutId, shots, frame, effect, stickers, texts, showDate, qr }, ref) {
    const stageRef = useRef<KonvaStage>(null)
    const groupRef = useRef<KonvaGroup>(null)
    const [index, setIndex] = useState(0)

    const layout = getLayout(layoutId)
    const scale = RECORD_WIDTH / layout.canvas.width
    const frames = shots.map((shot) => shot?.clip ?? null)

    useImperativeHandle(
      ref,
      () => ({
        async record(loops = RECORD_LOOPS) {
          const canvas =
            stageRef.current?.getLayers()[0]?.getNativeCanvasElement() ?? null
          const hasFrames = frames.some(
            (item) => item !== null && item.length > 0
          )
          if (canvas === null || !hasFrames) {
            return null
          }
          return recordStripVideo(canvas, setIndex, CLIP_FRAME_COUNT, loops)
        },
      }),
      [frames]
    )

    return (
      <div className="absolute top-0 left-[-9999px]" aria-hidden>
        <Stage
          ref={stageRef}
          width={RECORD_WIDTH}
          height={layout.canvas.height * scale}
          listening={false}
        >
          <StripStage
            layoutId={layoutId}
            shots={shots}
            frame={frame}
            effect={effect}
            stickers={stickers}
            texts={texts}
            showDate={showDate}
            qr={qr}
            live={{ frames, index, chrome: false }}
            scale={scale}
            groupRef={groupRef}
            onSelect={IGNORE}
            onChangeSticker={IGNORE}
            onChangeText={IGNORE}
          />
        </Stage>
      </div>
    )
  }
)
