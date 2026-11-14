import type { Metadata } from "next"
import { SmtpView } from "@/components/smtp/smtp-view"

export const metadata: Metadata = { title: "SMTP Configuration" }

export default function SmtpPage() {
  return <SmtpView />
}
