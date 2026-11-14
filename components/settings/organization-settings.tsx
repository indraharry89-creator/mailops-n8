"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ErrorState } from "@/components/dashboard/states"
import { useOrg } from "@/components/providers/org-provider"
import { useOrgSettings } from "@/hooks/use-mailops"
import { api } from "@/lib/api/services"
import type { OrgSettings } from "@/lib/api/types"

const TIMEZONES = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Singapore", "Asia/Tokyo"].map(
  (tz) => ({ value: tz, label: tz }),
)

export function OrganizationSettings() {
  const { orgId } = useOrg()
  const { data, error, mutate } = useOrgSettings()

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />
  if (!data) return <Skeleton className="h-[28rem] rounded-xl" />
  return <OrganizationForm key={orgId + JSON.stringify(data)} orgId={orgId} initial={data} onSaved={(s) => mutate(s, { revalidate: false })} />
}

function OrganizationForm({ orgId, initial, onSaved }: { orgId: string; initial: OrgSettings; onSaved: (s: OrgSettings) => void }) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const set = <K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) => setDraft((d) => ({ ...d, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return toast.error("Organization name is required")
    setSaving(true)
    try {
      onSaved(await api.updateOrgSettings(orgId, { ...draft, name: draft.name.trim() }))
      toast.success("Organization settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Profile and default sending behaviour for this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-name">Name</Label>
            <Input id="org-name" value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input id="org-slug" value={draft.slug} readOnly disabled className="font-mono" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-sender">Default sender</Label>
            <Input id="org-sender" type="email" value={draft.defaultSender} onChange={(e) => set("defaultSender", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-tz">Timezone</Label>
            <Select items={TIMEZONES} value={draft.timezone} onValueChange={(v) => v && set("timezone", v)}>
              <SelectTrigger id="org-tz" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="track-opens">Open tracking</Label>
              <p className="text-xs text-muted-foreground">Insert a tracking pixel in HTML messages.</p>
            </div>
            <Switch id="track-opens" checked={draft.trackOpens} onCheckedChange={(c) => set("trackOpens", c)} />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="track-clicks">Click tracking</Label>
              <p className="text-xs text-muted-foreground">Rewrite links to record clicks.</p>
            </div>
            <Switch id="track-clicks" checked={draft.trackClicks} onCheckedChange={(c) => set("trackClicks", c)} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(initial)} disabled={!dirty || saving}>
            Reset
          </Button>
          <Button type="submit" size="sm" disabled={!dirty || saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
