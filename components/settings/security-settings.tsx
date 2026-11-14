"use client"

import { useState } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ErrorState } from "@/components/dashboard/states"
import { useOrg } from "@/components/providers/org-provider"
import { useSecuritySettings } from "@/hooks/use-mailops"
import { api } from "@/lib/api/services"
import type { SecuritySettings } from "@/lib/api/types"

const TIMEOUTS = [15, 30, 60, 240, 480, 1440].map((m) => ({
  value: String(m),
  label: m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : m === 1440 ? "24 hours" : `${m / 60} hours`,
}))

const CIDR_PATTERN = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}(\/([0-9]|[12]\d|3[0-2]))?$/

export function SecuritySettingsPanel() {
  const { orgId } = useOrg()
  const { data, error, mutate } = useSecuritySettings()

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />
  if (!data) return <Skeleton className="h-[28rem] rounded-xl" />
  return <SecurityForm key={orgId + JSON.stringify(data)} orgId={orgId} initial={data} onSaved={(s) => mutate(s, { revalidate: false })} />
}

function SecurityForm({ orgId, initial, onSaved }: { orgId: string; initial: SecuritySettings; onSaved: (s: SecuritySettings) => void }) {
  const [draft, setDraft] = useState(initial)
  const [cidr, setCidr] = useState("")
  const [cidrError, setCidrError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  function addCidr() {
    const value = cidr.trim()
    if (!CIDR_PATTERN.test(value)) return setCidrError("Enter an IPv4 address or CIDR range, e.g. 203.0.113.0/24")
    if (draft.ipAllowlist.includes(value)) return setCidrError("Already in the allowlist")
    setDraft((d) => ({ ...d, ipAllowlist: [...d.ipAllowlist, value] }))
    setCidr("")
  }

  async function save() {
    setSaving(true)
    try {
      onSaved(await api.updateSecuritySettings(orgId, draft))
      toast.success("Security settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Access policies applied to every member of this organization.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="enforce-2fa">Enforce two-factor authentication</Label>
              <p className="text-xs text-muted-foreground">Members without 2FA are prompted at next sign-in.</p>
            </div>
            <Switch id="enforce-2fa" checked={draft.twoFactorEnforced} onCheckedChange={(c) => setDraft((d) => ({ ...d, twoFactorEnforced: c }))} />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="sso">Single sign-on (SAML)</Label>
              <p className="text-xs text-muted-foreground">Require login through your identity provider.</p>
            </div>
            <Switch id="sso" checked={draft.ssoEnabled} onCheckedChange={(c) => setDraft((d) => ({ ...d, ssoEnabled: c }))} />
          </div>
        </div>
        <div className="flex max-w-xs flex-col gap-2">
          <Label htmlFor="session-timeout">Session timeout</Label>
          <Select
            items={TIMEOUTS}
            value={String(draft.sessionTimeoutMinutes)}
            onValueChange={(v) => v && setDraft((d) => ({ ...d, sessionTimeoutMinutes: Number(v) }))}
          >
            <SelectTrigger id="session-timeout" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEOUTS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cidr">IP allowlist</Label>
          <p className="text-xs text-muted-foreground">Restrict dashboard and API access to these addresses. Leave empty to allow all.</p>
          <div className="flex max-w-md gap-2">
            <Input
              id="cidr"
              value={cidr}
              onChange={(e) => {
                setCidr(e.target.value)
                setCidrError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  addCidr()
                }
              }}
              placeholder="203.0.113.0/24"
              className="font-mono"
              aria-invalid={cidrError !== null}
              aria-describedby={cidrError ? "cidr-error" : undefined}
            />
            <Button type="button" variant="outline" onClick={addCidr} disabled={!cidr.trim()}>
              Add
            </Button>
          </div>
          {cidrError && (
            <p id="cidr-error" className="text-xs text-destructive">
              {cidrError}
            </p>
          )}
          {draft.ipAllowlist.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1">
              {draft.ipAllowlist.map((ip) => (
                <li key={ip}>
                  <Badge variant="secondary" className="gap-1 pr-1 font-mono">
                    {ip}
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, ipAllowlist: d.ipAllowlist.filter((x) => x !== ip) }))}
                      className="rounded-sm p-0.5 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label={`Remove ${ip}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="ghost" size="sm" onClick={() => setDraft(initial)} disabled={!dirty || saving}>
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
