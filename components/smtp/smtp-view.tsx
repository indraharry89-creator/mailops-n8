"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, RotateCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { CopyButton } from "@/components/dashboard/copy-button"
import { PageHeader } from "@/components/dashboard/page-header"
import { ErrorState } from "@/components/dashboard/states"
import { useOrg } from "@/components/providers/org-provider"
import { useSmtpConfig } from "@/hooks/use-mailops"
import { api } from "@/lib/api/services"
import type { SmtpConfig, TlsMode } from "@/lib/api/types"

const TLS_MODES = [
  { value: "starttls", label: "STARTTLS (recommended)" },
  { value: "ssl", label: "Implicit TLS / SSL" },
  { value: "none", label: "No encryption" },
]

const TLS_VERSIONS = [
  { value: "1.2", label: "TLS 1.2" },
  { value: "1.3", label: "TLS 1.3" },
]

function buildConfigText(config: SmtpConfig) {
  const port = config.tls.mode === "ssl" ? 465 : 587
  return [
    `SMTP_HOST=${config.hostname}`,
    `SMTP_PORT=${port}`,
    `SMTP_USERNAME=${config.username}`,
    `SMTP_PASSWORD=${config.password}`,
    `SMTP_SECURE=${config.tls.mode === "ssl"}`,
    `SMTP_REQUIRE_TLS=${config.tls.requireTls}`,
  ].join("\n")
}

function CredentialRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(false)
  const display = secret && !revealed ? "•".repeat(Math.min(value.length, 28)) : value
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-md border bg-muted/40 py-1 pr-1 pl-3">
        <code className="min-w-0 flex-1 truncate font-mono text-sm">{display}</code>
        {secret && (
          <Button variant="ghost" size="icon-sm" onClick={() => setRevealed((r) => !r)} aria-label={revealed ? `Hide ${label}` : `Show ${label}`}>
            {revealed ? <EyeOff /> : <Eye />}
          </Button>
        )}
        <CopyButton value={value} label={`Copy ${label}`} successMessage={`${label} copied`} />
      </div>
    </div>
  )
}

export function SmtpView() {
  const { orgId } = useOrg()
  const { data, error, isLoading, mutate } = useSmtpConfig()

  return (
    <>
      <PageHeader
        title="SMTP Configuration"
        description="Connect any application or MTA to the MailOps relay using these credentials."
        actions={data && <CopyButton value={buildConfigText(data)} label="Copy configuration" showLabel variant="default" successMessage="SMTP configuration copied as .env" />}
      />

      {error ? (
        <ErrorState title="Couldn't load SMTP configuration" error={error} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-96 rounded-xl lg:col-span-3" />
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="flex flex-col gap-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Relay credentials</CardTitle>
                <CardDescription>Use these values in your application&apos;s SMTP settings.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <CredentialRow label="Hostname" value={data.hostname} />
                <CredentialRow label="Username" value={data.username} />
                <CredentialRow label="Password" value={data.password} secret />
              </CardContent>
              <CardFooter className="justify-between gap-4 border-t">
                <p className="text-xs text-muted-foreground">Rotating invalidates the current password immediately.</p>
                <RotatePasswordButton orgId={orgId} onRotated={(c) => mutate(c, { revalidate: false })} />
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ports</CardTitle>
                <CardDescription>All ports accept authenticated submissions.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {data.ports.map((p) => (
                  <div key={p.port} className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <span className="font-mono text-lg font-semibold tabular-nums">{p.port}</span>
                    <span className="text-xs text-muted-foreground">{p.security}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <TlsSettingsCard
            key={`${orgId}-${data.tls.mode}-${data.tls.minVersion}-${data.tls.requireTls}`}
            orgId={orgId}
            tls={data.tls}
            onSaved={(c) => mutate(c, { revalidate: false })}
          />
        </div>
      )}
    </>
  )
}

function RotatePasswordButton({ orgId, onRotated }: { orgId: string; onRotated: (c: SmtpConfig) => void }) {
  const [pending, setPending] = useState(false)
  async function rotate() {
    setPending(true)
    try {
      onRotated(await api.rotateSmtpPassword(orgId))
      toast.success("SMTP password rotated", { description: "Update your applications with the new password." })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't rotate password")
    } finally {
      setPending(false)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={rotate} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <RotateCw />}
      Rotate password
    </Button>
  )
}

function TlsSettingsCard({ orgId, tls, onSaved }: { orgId: string; tls: SmtpConfig["tls"]; onSaved: (c: SmtpConfig) => void }) {
  const [draft, setDraft] = useState(tls)
  const [saving, setSaving] = useState(false)
  const dirty = draft.mode !== tls.mode || draft.minVersion !== tls.minVersion || draft.requireTls !== tls.requireTls

  async function save() {
    setSaving(true)
    try {
      onSaved(await api.updateSmtpTls(orgId, draft))
      toast.success("TLS settings saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save TLS settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>TLS settings</CardTitle>
        <CardDescription>Control how connections to the relay are encrypted.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tls-mode">Encryption mode</Label>
          <Select items={TLS_MODES} value={draft.mode} onValueChange={(v) => v && setDraft((d) => ({ ...d, mode: v as TlsMode }))}>
            <SelectTrigger id="tls-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TLS_MODES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tls-version">Minimum TLS version</Label>
          <Select
            items={TLS_VERSIONS}
            value={draft.minVersion}
            onValueChange={(v) => v && setDraft((d) => ({ ...d, minVersion: v as "1.2" | "1.3" }))}
            disabled={draft.mode === "none"}
          >
            <SelectTrigger id="tls-version" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TLS_VERSIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="require-tls">Require TLS</Label>
            <p className="text-xs text-muted-foreground">Reject plaintext AUTH attempts on all ports.</p>
          </div>
          <Switch
            id="require-tls"
            checked={draft.requireTls}
            onCheckedChange={(checked) => setDraft((d) => ({ ...d, requireTls: checked }))}
            disabled={draft.mode === "none"}
          />
        </div>
        {draft.mode === "none" ? (
          <Alert variant="destructive">
            <AlertTitle>Credentials will be sent in plaintext</AlertTitle>
            <AlertDescription>Only disable encryption for trusted internal networks.</AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <ShieldCheck />
            <AlertTitle>Connections are encrypted</AlertTitle>
            <AlertDescription>Clients negotiate TLS {draft.minVersion} or newer.</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="ghost" size="sm" onClick={() => setDraft(tls)} disabled={!dirty || saving}>
          Reset
        </Button>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </CardFooter>
    </Card>
  )
}
