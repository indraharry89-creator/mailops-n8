"use client"

import { useState } from "react"
import { Loader2, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ErrorState, TableSkeleton } from "@/components/dashboard/states"
import { useOrg } from "@/components/providers/org-provider"
import { useMembers } from "@/hooks/use-mailops"
import { api } from "@/lib/api/services"
import type { Member, MemberRole } from "@/lib/api/types"
import { formatRelative } from "@/lib/format"

const ROLES: { value: MemberRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
]
const ASSIGNABLE = ROLES.filter((r) => r.value !== "owner")
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function TeamMembers() {
  const { orgId, user } = useOrg()
  const { data, error, mutate } = useMembers()
  const [inviteOpen, setInviteOpen] = useState(false)
  const canManage = user?.role === "owner" || user?.role === "admin"

  async function changeRole(member: Member, role: MemberRole) {
    try {
      const updated = await api.updateMemberRole(orgId, member.id, role)
      await mutate((list) => list?.map((m) => (m.id === updated.id ? updated : m)), { revalidate: false })
      toast.success(`${member.name} is now ${role}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update role")
    }
  }

  async function remove(member: Member) {
    try {
      await api.removeMember(orgId, member.id)
      await mutate((list) => list?.filter((m) => m.id !== member.id), { revalidate: false })
      toast.success(`Removed ${member.name}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove member")
    }
  }

  return (
    <Card className="gap-0">
      <CardHeader className="pb-4">
        <CardTitle>Team members</CardTitle>
        <CardDescription>Control who can access this organization and what they can change.</CardDescription>
        {canManage && (
          <CardAction>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus />
              Invite
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="px-0">
        {error ? (
          <ErrorState className="mx-6" error={error} onRetry={() => mutate()} />
        ) : !data ? (
          <TableSkeleton rows={4} columns={4} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Last active</TableHead>
                <TableHead className="pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => {
                const isSelf = m.email === user?.email
                const editable = canManage && m.role !== "owner" && !isSelf
                return (
                  <TableRow key={m.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-2 truncate font-medium">
                            {m.name}
                            {isSelf && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                            {m.status === "invited" && <Badge variant="outline">Invited</Badge>}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <Select items={ASSIGNABLE} value={m.role} onValueChange={(v) => v && v !== m.role && changeRole(m, v as MemberRole)}>
                          <SelectTrigger size="sm" className="w-32" aria-label={`Role for ${m.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm capitalize">{m.role}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {m.status === "invited" ? "Pending invite" : formatRelative(m.lastActive)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {editable && (
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(m)} aria-label={`Remove ${m.name}`}>
                          <Trash2 />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        existing={data?.map((m) => m.email.toLowerCase()) ?? []}
        onInvited={(m) => mutate((list) => [...(list ?? []), m], { revalidate: false })}
      />
    </Card>
  )
}

function InviteDialog({
  open,
  onOpenChange,
  existing,
  onInvited,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing: string[]
  onInvited: (m: Member) => void
}) {
  const { orgId } = useOrg()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<MemberRole>("developer")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(value)) return setError("Enter a valid email address")
    if (existing.includes(value)) return setError("This person is already a member")
    setPending(true)
    try {
      onInvited(await api.inviteMember(orgId, { email: value, role }))
      toast.success(`Invitation sent to ${value}`)
      setEmail("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send invite")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && (onOpenChange(next), !next && setError(null))}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>They&apos;ll receive an email with a link to join this organization.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              placeholder="teammate@company.com"
              aria-invalid={error !== null}
              aria-describedby={error ? "invite-error" : undefined}
              autoFocus
            />
            {error && (
              <p id="invite-error" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select items={ASSIGNABLE} value={role} onValueChange={(v) => v && setRole(v as MemberRole)}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !email.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
