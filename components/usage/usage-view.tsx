"use client"

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/dashboard/page-header"
import { ChartSkeleton, ErrorState } from "@/components/dashboard/states"
import { useUsage } from "@/hooks/use-mailops"
import { formatCompact, formatDate, formatNumber, formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

const chartConfig = { sent: { label: "Sent", color: "var(--chart-2)" } } satisfies ChartConfig

function QuotaCard({
  title,
  description,
  used,
  limit,
  footer,
}: {
  title: string
  description: string
  used: number
  limit: number
  footer: string
}) {
  const pct = Math.min(100, (used / limit) * 100)
  const level = pct >= 90 ? "critical" : pct >= 75 ? "warning" : "ok"
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatNumber(used)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">of {formatNumber(limit)}</span>
        </div>
        <Progress
          value={pct}
          aria-label={`${title}: ${pct.toFixed(1)}% used`}
          className={cn(
            level === "critical" && "[&_[data-slot=progress-indicator]]:bg-destructive",
            level === "warning" && "[&_[data-slot=progress-indicator]]:bg-warning",
          )}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">{pct.toFixed(1)}% used</span>
          <span>{footer}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function UsageView() {
  const { data, error, isLoading, mutate } = useUsage()

  return (
    <>
      <PageHeader
        title="Usage & Quota"
        description="Track consumption against your plan limits. Quotas reset on the first of each month."
        actions={data && <Badge variant="secondary">{data.plan} plan</Badge>}
      />

      {error ? (
        <ErrorState title="Couldn't load usage" error={error} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
          </div>
          <Card>
            <CardContent>
              <ChartSkeleton />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {data.monthlyUsed / data.monthlyQuota >= 0.8 && (
            <Alert>
              <AlertTitle>You&apos;ve used over 80% of your monthly quota</AlertTitle>
              <AlertDescription>
                Messages beyond your quota are queued until {formatDate(data.resetDate)}. Contact sales to raise your limit.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <QuotaCard
              title="Monthly email quota"
              description="Messages accepted this billing cycle"
              used={data.monthlyUsed}
              limit={data.monthlyQuota}
              footer={`Resets ${formatDate(data.resetDate)}`}
            />
            <QuotaCard
              title="Daily sending limit"
              description="Messages accepted today (UTC)"
              used={data.dailyUsed}
              limit={data.dailyLimit}
              footer={`${formatNumber(Math.max(0, data.dailyLimit - data.dailyUsed))} remaining`}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Daily usage this month</CardTitle>
              <CardDescription>Dashed line marks your daily sending limit</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                <BarChart data={data.daily} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={formatShortDate} />
                  <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} domain={[0, Math.ceil(data.dailyLimit * 1.1)]} />
                  <ChartTooltip content={<ChartTooltipContent hideIndicator labelFormatter={(v) => formatShortDate(String(v))} />} />
                  <ReferenceLine y={data.dailyLimit} stroke="var(--destructive)" strokeDasharray="4 4" />
                  <Bar dataKey="sent" fill="var(--color-sent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
