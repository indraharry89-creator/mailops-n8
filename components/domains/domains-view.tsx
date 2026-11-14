"use client"

import { useState } from "react"
import { Globe, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CopyButton } from "@/components/dashboard/copy-button"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState, ErrorState } from "@/components/dashboard/states"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useOrg } from "@/components/providers/org-provider"
import { useDomains } from "@/hooks/use-mailops"
import { api } from "@/lib/api/services"
import type { DnsRecord, Domain } from "@/lib/api/types"
import { formatDate } from "@/lib/format"

const DOMAIN_PATTERN = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i

export function DomainsView() {
  const { orgId } = useOrg()
  const { data, error, isLoading, mutate } = useDomains()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null)

  function replace(domain: Domain) {
    mutate((list) => list?.map((d) => (d.id === domain.id ? domain : d)), { revalidate: false })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await api.deleteDomain(orgId, deleteTarget.id)
      await mutate((list) => list?.filter((d) => d.id !== deleteTarget.id), { revalidate: false })
      toast.success(`Removed ${deleteTarget.name}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove domain")
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Domains"
        description="Authenticate sending domains with SPF, DKIM and DMARC to maximise inbox placement."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus />
            Add domain
          </Button>
        }
      />

      {error ? (
        <ErrorState title="Couldn't load domains" error={error} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={Globe}
            title="No sending domains"
            description="Add the domain you send from to publish authentication records."
            action={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus />
                Add domain
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {data.map((domain) => (
            <DomainCard key={domain.id} domain={domain} orgId={orgId} onUpdated={replace} onDelete={() => setDeleteTarget(domain)} />
          ))}
        </div>
      )}

      <AddDomainDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existing={data?.map((d) => d.name) ?? []}
        onAdded={(d) => mutate((list) => [d, ...(list ?? [])], { revalidate: false })}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Messages from this domain will be rejected until it is added and verified again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Remove domain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DomainCard({
  domain,
  orgId,
  onUpdated,
  onDelete,
}: {
  domain: Domain
  orgId: string
  onUpdated: (d: Domain) => void
  onDelete: () => void
}) {
  const [verifying, setVerifying] = useState(false)

  async function verify() {
    setVerifying(true)
    try {
      const updated = await api.verifyDomain(orgId, domain.id)
      onUpdated(updated)
      if (updated.status === "verified") toast.success(`${domain.name} is fully verified`)
      else toast.warning("Some records are not yet detected", { description: "DNS changes can take up to 48 hours to propagate." })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed")
    } finally {
      setVerifying(false)
    }
  }

  const records: { label: string; record: DnsRecord }[] = [
    { label: "SPF", record: domain.spf },
    { label: "DKIM", record: domain.dkim },
    { label: "DMARC", record: domain.dmarc },
  ]

  return (
    <Card className="gap-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{domain.name}</span>
          <StatusBadge status={domain.status} />
        </CardTitle>
        <CardDescription>Added {formatDate(domain.createdAt)}</CardDescription>
        <CardAction className="flex gap-1">
          <Button variant="outline" size="sm" onClick={verify} disabled={verifying}>
            {verifying ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            <span className="hidden sm:inline">Verify DNS</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Remove ${domain.name}`}>
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y border-t">
          {records.map(({ label, record }) => (
            <li key={label} className="grid gap-3 px-6 py-4 md:grid-cols-[7rem_1fr_auto] md:items-center">
              <div className="flex items-center justify-between gap-2 md:flex-col md:items-start">
                <span className="text-sm font-semibold">{label}</span>
                <StatusBadge status={record.status} />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-12 shrink-0 text-muted-foreground">Type</span>
                  <code className="font-mono">{record.type}</code>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-12 shrink-0 text-muted-foreground">Host</span>
                  <code className="min-w-0 truncate font-mono">{record.host}</code>
                  <CopyButton value={record.host} label={`Copy ${label} host`} />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-12 shrink-0 text-muted-foreground">Value</span>
                  <code className="min-w-0 truncate rounded bg-muted px-1.5 py-0.5 font-mono">{record.value}</code>
                  <CopyButton value={record.value} label={`Copy ${label} value`} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function AddDomainDialog({
  open,
  onOpenChange,
  existing,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing: string[]
  onAdded: (d: Domain) => void
}) {
  const { orgId } = useOrg()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = name.trim().toLowerCase()
    if (!DOMAIN_PATTERN.test(value)) return setError("Enter a valid domain such as mail.example.com")
    if (existing.includes(value)) return setError("This domain has already been added")
    setPending(true)
    try {
      onAdded(await api.addDomain(orgId, value))
      toast.success(`${value} added`, { description: "Publish the DNS records shown, then verify." })
      setName("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add domain")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
        if (!next) setError(null)
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Add sending domain</DialogTitle>
            <DialogDescription>We&apos;ll generate SPF, DKIM and DMARC records for you to publish.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="domain-name">Domain</Label>
            <Input
              id="domain-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="mail.example.com"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error !== null}
              aria-describedby={error ? "domain-error" : undefined}
              autoFocus
            />
            {error && (
              <p id="domain-error" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              Add domain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
