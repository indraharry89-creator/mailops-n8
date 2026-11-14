"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Clock, MailX, Percent, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card"
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/dashboard/states"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useEmails, useOverview } from "@/hooks/use-mailops"
import { formatNumber, formatPercent, formatRelative } from "@/lib/format"
import { TrafficChart } from "./traffic-chart"

export function OverviewView() {
  const [days, setDays] = useState(30)
  const { data, error, isLoading, mutate } = useOverview(days)

  return (
    <>
      <PageHeader
        title="Overview"
        description="Delivery performance across all sending domains for the selected period."
        actions={
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList>
              <TabsTrigger value="7">7 days</TabsTrigger>
              <TabsTrigger value="14">14 days</TabsTrigger>
              <TabsTrigger value="30">30 days</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {error ? (
        <ErrorState title="Couldn't load delivery stats" error={error} onRetry={() => mutate()} />
      ) : (
        <>
          <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {isLoading || !data ? (
              Array.from({ length: 5 }, (_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard label="Total sent" value={formatNumber(data.totalSent)} change={data.changes.totalSent} icon={Send} />
                <StatCard label="Delivered" value={formatNumber(data.delivered)} change={data.changes.delivered} icon={CheckCircle2} tone="success" />
                <StatCard label="Bounced" value={formatNumber(data.bounced)} change={data.changes.bounced} invertTrend icon={MailX} tone="destructive" />
                <StatCard label="Deferred" value={formatNumber(data.deferred)} change={data.changes.deferred} invertTrend icon={Clock} tone="warning" />
                <StatCard label="Delivery rate" value={formatPercent(data.deliveryRate)} change={data.changes.deliveryRate} changeSuffix="pp" icon={Percent} tone="success" />
              </>
            )}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Daily email traffic</CardTitle>
              <CardDescription>Messages processed per day, by final delivery outcome</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !data ? (
                <ChartSkeleton />
              ) : data.traffic.length === 0 ? (
                <EmptyState title="No traffic yet" description="Send your first message over SMTP or the API to see it here." />
              ) : (
                <TrafficChart data={data.traffic} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <RecentActivity />
    </>
  )
}

function RecentActivity() {
  const { data, error, isLoading, mutate } = useEmails({ page: 1, pageSize: 6, range: "24h" })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest messages from the past 24 hours</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" render={<Link href="/activity" />}>
            View all
            <ArrowRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {error ? (
          <ErrorState className="mx-6" error={error} onRetry={() => mutate()} />
        ) : isLoading || !data ? (
          <ul className="flex flex-col gap-3 px-6" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </ul>
        ) : data.items.length === 0 ? (
          <EmptyState title="No messages in the last 24 hours" />
        ) : (
          <ul className="divide-y">
            {data.items.map((email) => (
              <li key={email.id} className="flex items-center gap-4 px-6 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{email.subject}</span>
                  <span className="truncate text-xs text-muted-foreground">To {email.recipient}</span>
                </div>
                <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                  {email.smtpCode || "—"}
                </span>
                <StatusBadge status={email.status} />
                <span className="hidden w-16 text-right text-xs text-muted-foreground md:inline">
                  {formatRelative(email.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
