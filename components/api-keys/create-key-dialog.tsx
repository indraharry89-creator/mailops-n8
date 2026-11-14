"use client"

import { useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CopyButton } from "@/components/dashboard/copy-button"
import { useOrg } from "@/components/providers/org-provider"
import { api } from "@/lib/api/services"
import type { ApiKey, ApiScope } from "@/lib/api/types"

const SCOPES: { value: ApiScope; label: string; description: string }[] = [
  { value: "mail.send", label: "Send mail", description: "Submit messages via POST /v1/messages" },
  { value: "stats.read", label: "Read statistics", description: "Query delivery events and analytics" },
  { value: "domains.manage", label: "Manage domains", description: "Add, verify and remove sending domains" },
  { value: "keys.manage", label: "Manage keys", description: "Create and revoke other API keys" },
]

export function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (key: ApiKey) => void
}) {
  const { orgId } = useOrg()
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<ApiScope[]>(["mail.send"])
  const [pending, setPending] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)

  function reset() {
    setName("")
    setScopes(["mail.send"])
    setSecret(null)
  }

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setTimeout(reset, 200)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || scopes.length === 0) return
    setPending(true)
    try {
      const created = await api.createApiKey(orgId, { name: trimmed.slice(0, 64), scopes })
      onCreated(created.key)
      setSecret(created.secret)
      toast.success("API key generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create key")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {secret ? (
          <>
            <DialogHeader>
              <DialogTitle>Save your API key</DialogTitle>
              <DialogDescription>Copy this secret now. For your security it won&apos;t be shown again.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-1 rounded-md border bg-muted/40 py-1 pr-1 pl-3">
              <code className="min-w-0 flex-1 truncate font-mono text-sm">{secret}</code>
              <CopyButton value={secret} label="Copy API key" successMessage="API key copied" />
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning-foreground" aria-hidden="true" />
              Store it in a secrets manager or environment variable — never commit it to source control.
            </p>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>Generate API key</DialogTitle>
              <DialogDescription>Give the key a descriptive name and grant only the scopes it needs.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production backend"
                maxLength={64}
                required
                autoFocus
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Scopes</legend>
              {SCOPES.map((s) => {
                const id = `scope-${s.value}`
                return (
                  <div key={s.value} className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
                    <div className="flex flex-col">
                      <Label htmlFor={id}>{s.label}</Label>
                      <span className="text-xs text-muted-foreground">{s.description}</span>
                    </div>
                    <Switch
                      id={id}
                      checked={scopes.includes(s.value)}
                      onCheckedChange={(checked) =>
                        setScopes((prev) => (checked ? [...prev, s.value] : prev.filter((v) => v !== s.value)))
                      }
                    />
                  </div>
                )
              })}
              {scopes.length === 0 && <p className="text-xs text-destructive">Select at least one scope.</p>}
            </fieldset>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim() || scopes.length === 0}>
                {pending && <Loader2 className="animate-spin" />}
                Generate key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
