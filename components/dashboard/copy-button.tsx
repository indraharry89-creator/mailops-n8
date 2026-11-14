"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function CopyButton({
  value,
  label = "Copy",
  showLabel = false,
  variant = "ghost",
  size,
  successMessage = "Copied to clipboard",
}: {
  value: string
  label?: string
  showLabel?: boolean
  variant?: "ghost" | "outline" | "default" | "secondary"
  size?: "sm" | "default" | "icon" | "icon-sm"
  successMessage?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(successMessage)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Clipboard access was blocked by the browser")
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (showLabel ? "sm" : "icon-sm")}
      onClick={handleCopy}
      aria-label={showLabel ? undefined : label}
    >
      {copied ? <Check /> : <Copy />}
      {showLabel && (copied ? "Copied" : label)}
    </Button>
  )
}
