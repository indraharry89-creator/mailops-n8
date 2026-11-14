"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCompact, formatShortDate } from "@/lib/format"
import type { AnalyticsData } from "@/lib/api/types"

const deliveryConfig = {
  delivered: { label: "Delivered", color: "var(--chart-1)" },
  deferred: { label: "Deferred", color: "var(--chart-4)" },
  bounced: { label: "Bounced", color: "var(--chart-3)" },
} satisfies ChartConfig

export function DailyDeliveryChart({ data }: { data: AnalyticsData["daily"] }) {
  return (
    <ChartContainer config={deliveryConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={formatShortDate} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatShortDate(String(v))} />} />
        <Bar dataKey="delivered" stackId="a" fill="var(--color-delivered)" />
        <Bar dataKey="deferred" stackId="a" fill="var(--color-deferred)" />
        <Bar dataKey="bounced" stackId="a" fill="var(--color-bounced)" radius={[4, 4, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  )
}

const bounceConfig = { rate: { label: "Bounce rate", color: "var(--chart-3)" } } satisfies ChartConfig

export function BounceRateChart({ data }: { data: AnalyticsData["bounceRate"] }) {
  return (
    <ChartContainer config={bounceConfig} className="aspect-auto h-60 w-full">
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={formatShortDate} />
        <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatShortDate(String(v))}
              formatter={(value) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">Bounce rate</span>
                  <span className="font-mono font-medium tabular-nums">{Number(value).toFixed(2)}%</span>
                </span>
              )}
            />
          }
        />
        <Line dataKey="rate" type="monotone" stroke="var(--color-rate)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}

const volumeConfig = { volume: { label: "Volume", color: "var(--chart-2)" } } satisfies ChartConfig

export function VolumeTrendChart({ data }: { data: AnalyticsData["volume"] }) {
  return (
    <ChartContainer config={volumeConfig} className="aspect-auto h-60 w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} />
        <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="volume" fill="var(--color-volume)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
