/**
 * Shared API contracts. These mirror the Pydantic response models expected
 * from the MailOps FastAPI backend (snake_case is converted at the client edge).
 */

export type DeliveryStatus = "delivered" | "bounced" | "deferred" | "queued" | "rejected"

export interface Organization {
  id: string
  name: string
  slug: string
  plan: "Starter" | "Growth" | "Enterprise"
}

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: MemberRole
}

export interface DailyTraffic {
  date: string
  sent: number
  delivered: number
  bounced: number
  deferred: number
}

export interface OverviewStats {
  totalSent: number
  delivered: number
  bounced: number
  deferred: number
  deliveryRate: number
  changes: {
    totalSent: number
    delivered: number
    bounced: number
    deferred: number
    deliveryRate: number
  }
  traffic: DailyTraffic[]
}

export interface EmailEvent {
  id: string
  messageId: string
  recipient: string
  sender: string
  subject: string
  timestamp: string
  status: DeliveryStatus
  smtpCode: number
  smtpResponse: string
  ip: string
  attempts: number
}

export interface EmailQuery {
  search?: string
  status?: DeliveryStatus | "all"
  range?: "24h" | "7d" | "30d"
  page: number
  pageSize: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ProviderStat {
  provider: string
  sent: number
  delivered: number
  bounced: number
  deliveryRate: number
}

export interface AnalyticsData {
  daily: DailyTraffic[]
  bounceRate: { date: string; rate: number }[]
  providers: ProviderStat[]
  volume: { month: string; volume: number }[]
  summary: {
    avgDeliveryRate: number
    avgBounceRate: number
    peakDay: string
    peakVolume: number
  }
}

export type TlsMode = "starttls" | "ssl" | "none"

export interface SmtpConfig {
  hostname: string
  ports: { port: number; security: string }[]
  username: string
  password: string
  tls: {
    mode: TlsMode
    minVersion: "1.2" | "1.3"
    requireTls: boolean
  }
}

export type ApiScope = "mail.send" | "stats.read" | "domains.manage" | "keys.manage"

export interface ApiKey {
  id: string
  name: string
  prefix: string
  scopes: ApiScope[]
  createdAt: string
  lastUsedAt: string | null
  status: "active" | "revoked"
  requests30d: number
}

export interface CreatedApiKey {
  key: ApiKey
  secret: string
}

export interface ApiUsage {
  daily: { date: string; requests: number; errors: number }[]
  totalRequests: number
  errorRate: number
  avgLatencyMs: number
  topEndpoints: { method: string; endpoint: string; requests: number }[]
}

export type VerificationStatus = "verified" | "pending" | "failed"

export interface DnsRecord {
  type: "TXT" | "CNAME"
  host: string
  value: string
  status: VerificationStatus
}

export interface Domain {
  id: string
  name: string
  status: VerificationStatus
  createdAt: string
  spf: DnsRecord
  dkim: DnsRecord
  dmarc: DnsRecord
}

export interface UsageQuota {
  plan: Organization["plan"]
  monthlyQuota: number
  monthlyUsed: number
  dailyLimit: number
  dailyUsed: number
  resetDate: string
  daily: { date: string; sent: number }[]
}

export type MemberRole = "owner" | "admin" | "developer" | "viewer"

export interface Member {
  id: string
  name: string
  email: string
  role: MemberRole
  status: "active" | "invited"
  lastActive: string | null
}

export interface OrgSettings {
  name: string
  slug: string
  timezone: string
  defaultSender: string
  trackOpens: boolean
  trackClicks: boolean
}

export interface SecuritySettings {
  twoFactorEnforced: boolean
  sessionTimeoutMinutes: number
  ipAllowlist: string[]
  ssoEnabled: boolean
}
