"use client"

import { useState } from "react"
import { Activity, AlertCircle, KeyRound, Plus, Timer } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card"
import { ChartSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/dashboard/states"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useOrg } from "@/components/providers/org-provider"
import { useApiKeys, useApiUsage } from "@/hooks/use-mailops"
import { api } from "@/lib/api/services"
import type { ApiKey } from "@/lib/api/types"
import { formatCompact, formatDate, formatNumber, formatPercent, formatRelative, formatShortDate } from "@/lib/format"
import { CreateKeyDialog } from "./create-key-dialog"

const usageConfig = {
  requests: { label: "Requests", color: "var(--chart-1)" },
  errors: { label: "Errors", color: "var(--chart-3)" },
} satisfies ChartConfig

export function ApiKeysView() {
  const { orgId } = useOrg()
  const keys = useApiKeys()
  const usage = useApiUsage()
  const [createOpen, setCreateOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [revoking, setRevoking] = useState(false)

  async function confirmRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const revoked = await api.revokeApiKey(orgId, revokeTarget.id)
      await keys.mutate((list) => list?.map((k) => (k.id === revoked.id ? revoked : k)), { revalidate: false })
      toast.success(`Revoked "${revoked.name}"`)
      setRevokeTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't revoke key")
    } finally {
      setRevoking(false)
    }
  }

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Authenticate requests to the MailOps REST API. Keys are shown only once at creation."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Generate API key
          </Button>
        }
      />

      {usage.error ? (
        <ErrorState title="Couldn't load API usage" error={usage.error} onRetry={() => usage.mutate()} />
      ) : (
        <>
          <section aria-label="API usage" className="grid gap-4 sm:grid-cols-3">
            {!usage.data ? (
              Array.from({ length: 3 }, (_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard label="Requests (30d)" value={formatNumber(usage.data.totalRequests)} icon={Activity} />
                <StatCard label="Error rate" value={formatPercent(usage.data.errorRate)} icon={AlertCircle} tone="destructive" hint="4xx and 5xx responses" />
                <StatCard label="Avg. latency" value={`${usage.data.avgLatencyMs} ms`} icon={Timer} tone="success" hint="p50 across all endpoints" />
              </>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>API usage</CardTitle>
                <CardDescription>Daily requests and errors over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {!usage.data ? (
                  <ChartSkeleton className="h-60" />
                ) : (
                  <ChartContainer config={usageConfig} className="aspect-auto h-60 w-full">
                    <AreaChart data={usage.data.daily} margin={{ left: 0, right: 8, top: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={formatShortDate} />
                      <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatShortDate(String(v))} />} />
                      <Area dataKey="requests" type="monotone" stroke="var(--color-requests)" fill="var(--color-requests)" fillOpacity={0.12} strokeWidth={2} />
                      <Area dataKey="errors" type="monotone" stroke="var(--color-errors)" fill="var(--color-errors)" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top endpoints</CardTitle>
                <CardDescription>By request count</CardDescription>
              </CardHeader>
              <CardContent>
                {!usage.data ? (
                  <TableSkeleton rows={5} columns={2} />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {usage.data.topEndpoints.map((e) => (
                      <li key={`${e.method}-${e.endpoint}`} className="flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="w-14 justify-center font-mono text-[10px]">
                          {e.method}
                        </Badge>
                        <code className="min-w-0 flex-1 truncate font-mono text-xs">{e.endpoint}</code>
                        <span className="tabular-nums text-muted-foreground">{formatCompact(e.requests)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="gap-0">
        <CardHeader className="pb-4">
          <CardTitle>Keys</CardTitle>
          <CardDescription>Active and revoked keys for this organization</CardDescription>
          <CardAction>
            <span className="text-sm text-muted-foreground tabular-nums">
              {keys.data ? `${keys.data.filter((k) => k.status === "active").length} active` : ""}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {keys.error ? (
            <ErrorState className="mx-6" error={keys.error} onRetry={() => keys.mutate()} />
          ) : !keys.data ? (
            <TableSkeleton rows={4} columns={5} />
          ) : keys.data.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No API keys yet"
              description="Generate a key to start sending through the REST API."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus />
                  Generate API key
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead className="hidden md:table-cell">Scopes</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="hidden sm:table-cell">Last used</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Requests (30d)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.data.map((key) => (
                  <TableRow key={key.id} className={key.status === "revoked" ? "opacity-60" : undefined}>
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-medium">{key.name}</span>
                        <code className="font-mono text-xs text-muted-foreground">{key.prefix}••••••••</code>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(key.createdAt)}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatRelative(key.lastUsedAt)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatNumber(key.requests30d)}</TableCell>
                    <TableCell>
                      <StatusBadge status={key.status} />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {key.status === "active" && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRevokeTarget(key)}>
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(key) => keys.mutate((list) => [key, ...(list ?? [])], { revalidate: false })}
      />

      <AlertDialog open={revokeTarget !== null} onOpenChange={(open) => !open && !revoking && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke &quot;{revokeTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Any application using this key will immediately receive 401 errors. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRevoke} disabled={revoking}>
              {revoking ? "Revoking…" : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
