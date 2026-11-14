"use client"

import { useDeferredValue, useState } from "react"
import { ChevronLeft, ChevronRight, Search, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState, ErrorState, TableSkeleton } from "@/components/dashboard/states"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useEmails } from "@/hooks/use-mailops"
import { formatDateTime, formatNumber } from "@/lib/format"
import type { DeliveryStatus, EmailEvent, EmailQuery } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { EmailDetailSheet } from "./email-detail-sheet"

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "delivered", label: "Delivered" },
  { value: "bounced", label: "Bounced" },
  { value: "deferred", label: "Deferred" },
  { value: "queued", label: "Queued" },
  { value: "rejected", label: "Rejected" },
]

const RANGE_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]

const PAGE_SIZE = 15

function smtpCodeClass(code: number) {
  if (code >= 500) return "text-destructive"
  if (code >= 400) return "text-warning-foreground"
  if (code >= 200 && code < 300) return "text-success"
  return "text-muted-foreground"
}

export function ActivityView() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<DeliveryStatus | "all">("all")
  const [range, setRange] = useState<NonNullable<EmailQuery["range"]>>("7d")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<EmailEvent | null>(null)
  const deferredSearch = useDeferredValue(search)

  const { data, error, isLoading, isValidating, mutate } = useEmails({
    search: deferredSearch,
    status,
    range,
    page,
    pageSize: PAGE_SIZE,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const hasFilters = search !== "" || status !== "all"

  function resetFilters() {
    setSearch("")
    setStatus("all")
    setPage(1)
  }

  return (
    <>
      <PageHeader title="Email Activity" description="Search and inspect every message processed by your SMTP relay and API." />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search recipient, sender, subject, message ID or SMTP code"
              className="pl-8"
              aria-label="Search emails"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <Select
              items={STATUS_OPTIONS}
              value={status}
              onValueChange={(v) => {
                setStatus((v ?? "all") as DeliveryStatus | "all")
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={RANGE_OPTIONS}
              value={range}
              onValueChange={(v) => {
                setRange((v ?? "7d") as NonNullable<EmailQuery["range"]>)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-40" aria-label="Filter by time range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className={cn("px-0 transition-opacity", isValidating && data && "opacity-60")}>
          {error ? (
            <ErrorState className="m-4" title="Couldn't load email activity" error={error} onRetry={() => mutate()} />
          ) : isLoading || !data ? (
            <TableSkeleton rows={10} columns={6} />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No messages match your filters"
              description="Try a broader time range or a different search term."
              action={
                hasFilters && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Recipient</TableHead>
                  <TableHead className="hidden lg:table-cell">Sender</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden md:table-cell">Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">SMTP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((email) => (
                  <TableRow
                    key={email.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    onClick={() => setSelected(email)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelected(email)
                      }
                    }}
                    aria-label={`View details for message to ${email.recipient}`}
                  >
                    <TableCell className="max-w-52 truncate pl-4 font-medium">{email.recipient}</TableCell>
                    <TableCell className="hidden max-w-48 truncate text-muted-foreground lg:table-cell">{email.sender}</TableCell>
                    <TableCell className="max-w-72 truncate">{email.subject}</TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums md:table-cell">
                      {formatDateTime(email.timestamp)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={email.status} />
                    </TableCell>
                    <TableCell className={cn("pr-4 text-right font-mono text-xs font-medium", smtpCodeClass(email.smtpCode))}>
                      {email.smtpCode || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {data && data.total > 0 && (
          <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground tabular-nums">
              {formatNumber((page - 1) * PAGE_SIZE + 1)}–{formatNumber(Math.min(page * PAGE_SIZE, data.total))} of{" "}
              {formatNumber(data.total)}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <span className="tabular-nums text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <EmailDetailSheet email={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  )
}
