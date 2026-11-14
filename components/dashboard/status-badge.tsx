import { cn } from "@/lib/utils"
import type { DeliveryStatus, VerificationStatus } from "@/lib/api/types"

type Status = DeliveryStatus | VerificationStatus | "active" | "revoked" | "invited"

const STYLES: Record<Status, { label: string; className: string; dot: string }> = {
  delivered: { label: "Delivered", className: "bg-success/12 text-success", dot: "bg-success" },
  verified: { label: "Verified", className: "bg-success/12 text-success", dot: "bg-success" },
  active: { label: "Active", className: "bg-success/12 text-success", dot: "bg-success" },
  bounced: { label: "Bounced", className: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  deferred: { label: "Deferred", className: "bg-warning/18 text-warning-foreground", dot: "bg-warning" },
  pending: { label: "Pending", className: "bg-warning/18 text-warning-foreground", dot: "bg-warning" },
  invited: { label: "Invited", className: "bg-warning/18 text-warning-foreground", dot: "bg-warning" },
  queued: { label: "Queued", className: "bg-primary/10 text-primary", dot: "bg-primary" },
  revoked: { label: "Revoked", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const style = STYLES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        style.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden="true" />
      {style.label}
    </span>
  )
}
