import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  change,
  changeSuffix = "%",
  invertTrend = false,
  icon: Icon,
  tone = "primary",
  hint,
}: {
  label: string
  value: string
  change?: number
  changeSuffix?: string
  /** When true, an increase is considered negative (e.g. bounces). */
  invertTrend?: boolean
  icon: LucideIcon
  tone?: "primary" | "success" | "destructive" | "warning"
  hint?: string
}) {
  const positive = change !== undefined && change >= 0
  const good = invertTrend ? !positive : positive
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/18 text-warning-foreground",
  }[tone]

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className={cn("flex size-8 items-center justify-center rounded-lg", toneClass)}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        {change !== undefined ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
                good ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {positive ? <ArrowUpRight className="size-3" aria-hidden="true" /> : <ArrowDownRight className="size-3" aria-hidden="true" />}
              {positive ? "+" : ""}
              {change}
              {changeSuffix}
            </span>
            <span className="text-muted-foreground">{hint ?? "vs previous period"}</span>
          </div>
        ) : (
          hint && <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-36" />
      </CardContent>
    </Card>
  )
}
