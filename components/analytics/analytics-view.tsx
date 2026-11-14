"use client"

import { useState } from "react"
import { CalendarDays, MailX, Percent, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card"
import { ChartSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/dashboard/states"
import { useAnalytics } from "@/hooks/use-mailops"
import { formatDate, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { BounceRateChart, DailyDeliveryChart, VolumeTrendChart } from "./analytics-charts"

export function AnalyticsView() {
  const [days, setDays] = useState(30)
  const { data, error, isLoading, mutate } = useAnalytics(days)
  const loading = isLoading || !data

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Deliverability trends, bounce behaviour and mailbox provider performance."
        actions={
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList>
              <TabsTrigger value="14">14 days</TabsTrigger>
              <TabsTrigger value="30">30 days</TabsTrigger>
              <TabsTrigger value="60">60 days</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {error ? (
        <ErrorState title="Couldn't load analytics" error={error} onRetry={() => mutate()} />
      ) : (
        <>
          <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard label="Avg. delivery rate" value={formatPercent(data.summary.avgDeliveryRate)} icon={Percent} tone="success" hint={`Across ${days} days`} />
                <StatCard label="Avg. bounce rate" value={formatPercent(data.summary.avgBounceRate)} icon={MailX} tone="destructive" hint="Industry benchmark < 2%" />
                <StatCard label="Peak day" value={formatDate(data.summary.peakDay)} icon={CalendarDays} hint="Highest send volume" />
                <StatCard label="Peak volume" value={formatNumber(data.summary.peakVolume)} icon={TrendingUp} tone="warning" hint="Messages in a single day" />
              </>
            )}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Daily delivery statistics</CardTitle>
              <CardDescription>Final outcome of messages accepted each day</CardDescription>
            </CardHeader>
            <CardContent>{loading ? <ChartSkeleton /> : <DailyDeliveryChart data={data.daily} />}</CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bounce rate</CardTitle>
                <CardDescription>Hard and soft bounces as a share of sent mail</CardDescription>
              </CardHeader>
              <CardContent>{loading ? <ChartSkeleton className="h-60" /> : <BounceRateChart data={data.bounceRate} />}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Email volume trend</CardTitle>
                <CardDescription>Monthly messages sent over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>{loading ? <ChartSkeleton className="h-60" /> : <VolumeTrendChart data={data.volume} />}</CardContent>
            </Card>
          </div>

          <Card className="gap-0">
            <CardHeader className="pb-4">
              <CardTitle>Provider statistics</CardTitle>
              <CardDescription>Delivery performance by recipient mailbox provider</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {loading ? (
                <TableSkeleton rows={6} columns={5} />
              ) : data.providers.length === 0 ? (
                <EmptyState title="No provider data for this period" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Provider</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Delivered</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Bounced</TableHead>
                      <TableHead className="w-48 pr-6 md:w-64">Delivery rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.providers.map((p) => (
                      <TableRow key={p.provider}>
                        <TableCell className="pl-6 font-medium">{p.provider}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(p.sent)}</TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatNumber(p.delivered)}</TableCell>
                        <TableCell className="hidden text-right tabular-nums text-destructive sm:table-cell">{formatNumber(p.bounced)}</TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                              <div
                                className={cn("h-full rounded-full", p.deliveryRate >= 97 ? "bg-success" : p.deliveryRate >= 94 ? "bg-warning" : "bg-destructive")}
                                style={{ width: `${p.deliveryRate}%` }}
                              />
                            </div>
                            <span className="w-14 text-right text-sm tabular-nums">{formatPercent(p.deliveryRate, 1)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
