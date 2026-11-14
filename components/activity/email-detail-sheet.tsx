"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CopyButton } from "@/components/dashboard/copy-button"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { formatDateTime } from "@/lib/format"
import type { EmailEvent } from "@/lib/api/types"

function Field({ label, value, mono = false, copy }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex items-start gap-1">
        <span className={mono ? "font-mono text-xs break-all" : "text-sm break-words"}>{value}</span>
        {copy && <CopyButton value={value} label={`Copy ${label}`} />}
      </dd>
    </div>
  )
}

export function EmailDetailSheet({ email, onOpenChange }: { email: EmailEvent | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={email !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {email && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6 text-pretty">{email.subject}</SheetTitle>
              <SheetDescription>Message event details</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-6 px-4 pb-6">
              <div className="flex items-center gap-3">
                <StatusBadge status={email.status} />
                <span className="text-xs text-muted-foreground">{formatDateTime(email.timestamp)}</span>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">SMTP response</p>
                <p className="mt-1 font-mono text-xs">
                  <span className="font-semibold">{email.smtpCode || "—"}</span> {email.smtpResponse}
                </p>
              </div>
              <dl className="grid gap-4">
                <Field label="Recipient" value={email.recipient} copy />
                <Field label="Sender" value={email.sender} />
                <Field label="Message ID" value={email.messageId} mono copy />
                <Field label="Sending IP" value={email.ip} mono />
                <Field label="Delivery attempts" value={String(email.attempts)} />
              </dl>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
