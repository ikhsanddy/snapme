"use client"

import { type CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CheckCircle,
  Info,
  SpinnerGap,
  Warning,
  WarningOctagon,
} from "@phosphor-icons/react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CheckCircle weight="bold" className="size-4" />,
        info: <Info weight="bold" className="size-4" />,
        warning: <Warning weight="bold" className="size-4" />,
        error: <WarningOctagon weight="bold" className="size-4" />,
        loading: <SpinnerGap weight="bold" className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-paper)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "var(--color-ink)",
          "--border-radius": "var(--radius-card)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "rounded-card border-2 border-ink bg-paper text-ink font-sans shadow-hard",
          title: "font-display text-sm font-extrabold",
          description: "text-sm text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
