"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCompact, formatShortDate } from "@/lib/format"
import type { DailyTraffic } from "@/lib/api/types"

const config = {
  delivered: { label: "Delivered", color: "var(--chart-1)" },
  deferred: { label: "Deferred", color: "var(--chart-4)" },
  bounced: { label: "Bounced", color: "var(--chart-3)" },
} satisfies ChartConfig

export function TrafficChart({ data }: { data: DailyTraffic[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          {(["delivered", "deferred", "bounced"] as const).map((key) => (
            <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.35} />
              <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={formatShortDate} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" labelFormatter={(v) => formatShortDate(String(v))} />}
        />
        <Area dataKey="delivered" type="monotone" stroke="var(--color-delivered)" fill="url(#fill-delivered)" strokeWidth={2} />
        <Area dataKey="deferred" type="monotone" stroke="var(--color-deferred)" fill="url(#fill-deferred)" strokeWidth={2} />
        <Area dataKey="bounced" type="monotone" stroke="var(--color-bounced)" fill="url(#fill-bounced)" strokeWidth={2} />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}
