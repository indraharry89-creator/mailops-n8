import type {
  AnalyticsData,
  ApiKey,
  ApiScope,
  ApiUsage,
  CreatedApiKey,
  CurrentUser,
  DailyTraffic,
  DeliveryStatus,
  Domain,
  EmailEvent,
  EmailQuery,
  Member,
  MemberRole,
  Organization,
  OrgSettings,
  OverviewStats,
  Paginated,
  SecuritySettings,
  SmtpConfig,
  UsageQuota,
} from "./types"
import { ApiError } from "./client"

const DAY = 86_400_000

const ORGANIZATIONS: (Organization & { scale: number; domain: string; seed: number })[] = [
  { id: "org_acme", name: "Acme Corporation", slug: "acme", plan: "Enterprise", scale: 42_000, domain: "acme.io", seed: 7 },
  { id: "org_northwind", name: "Northwind Labs", slug: "northwind", plan: "Growth", scale: 11_500, domain: "northwind.dev", seed: 21 },
  { id: "org_pixel", name: "Pixel & Co Studio", slug: "pixel", plan: "Starter", scale: 1_650, domain: "pixelco.studio", seed: 42 },
]

const CURRENT_USER: CurrentUser = {
  id: "usr_01",
  name: "Elena Marsh",
  email: "elena.marsh@acme.io",
  role: "owner",
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const delay = (ms = 350 + Math.random() * 450) => new Promise((resolve) => setTimeout(resolve, ms))

function getOrg(orgId: string) {
  const org = ORGANIZATIONS.find((o) => o.id === orgId)
  if (!org) throw new ApiError("Organization not found", 404)
  return org
}

function isoDay(offsetDays: number) {
  const d = new Date(Date.now() - offsetDays * DAY)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function randomToken(length: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}

/* ---------------------------------- Traffic --------------------------------- */

const trafficCache = new Map<string, DailyTraffic[]>()

function getTraffic(orgId: string, days = 90): DailyTraffic[] {
  const key = `${orgId}:${days}`
  const cached = trafficCache.get(key)
  if (cached) return cached
  const org = getOrg(orgId)
  const rand = mulberry32(org.seed)
  const result: DailyTraffic[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * DAY)
    const weekday = date.getDay()
    const weekend = weekday === 0 || weekday === 6 ? 0.62 : 1
    const trend = 1 + (days - i) * 0.0035
    const sent = Math.round(org.scale * weekend * trend * (0.86 + rand() * 0.28))
    const bounceRate = 0.009 + rand() * 0.016
    const deferRate = 0.004 + rand() * 0.012
    const bounced = Math.round(sent * bounceRate)
    const deferred = Math.round(sent * deferRate)
    result.push({ date: isoDay(i), sent, bounced, deferred, delivered: sent - bounced - deferred })
  }
  trafficCache.set(key, result)
  return result
}

function sumTraffic(rows: DailyTraffic[]) {
  return rows.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      delivered: acc.delivered + r.delivered,
      bounced: acc.bounced + r.bounced,
      deferred: acc.deferred + r.deferred,
    }),
    { sent: 0, delivered: 0, bounced: 0, deferred: 0 },
  )
}

const pctChange = (current: number, previous: number) =>
  previous === 0 ? 0 : Math.round(((current - previous) / previous) * 1000) / 10

export async function getOverview(orgId: string, days = 30): Promise<OverviewStats> {
  await delay()
  const all = getTraffic(orgId, days * 2)
  const current = all.slice(days)
  const previous = all.slice(0, days)
  const c = sumTraffic(current)
  const p = sumTraffic(previous)
  const rate = (t: typeof c) => (t.sent ? Math.round((t.delivered / t.sent) * 10000) / 100 : 0)
  return {
    totalSent: c.sent,
    delivered: c.delivered,
    bounced: c.bounced,
    deferred: c.deferred,
    deliveryRate: rate(c),
    changes: {
      totalSent: pctChange(c.sent, p.sent),
      delivered: pctChange(c.delivered, p.delivered),
      bounced: pctChange(c.bounced, p.bounced),
      deferred: pctChange(c.deferred, p.deferred),
      deliveryRate: Math.round((rate(c) - rate(p)) * 100) / 100,
    },
    traffic: current,
  }
}

/* ---------------------------------- Emails ---------------------------------- */

const FIRST_NAMES = ["james", "olivia", "liam", "ava", "noah", "mia", "lucas", "sofia", "ethan", "chloe", "mateo", "aria", "kai", "zoe", "ravi", "hana", "omar", "lena", "diego", "nora"]
const LAST_NAMES = ["smith", "chen", "patel", "garcia", "kim", "nguyen", "muller", "rossi", "silva", "khan", "johnson", "ito", "novak", "berg"]
const RECIPIENT_DOMAINS = ["gmail.com", "gmail.com", "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "stripe.com", "shopify.com", "fastmail.com"]
const SENDERS = ["notifications", "no-reply", "billing", "support", "team", "security"]
const SUBJECTS = [
  "Your order #{n} has shipped",
  "Reset your password",
  "Welcome to {org} — let's get started",
  "Invoice {n} is ready",
  "Verify your email address",
  "Your weekly activity summary",
  "New sign-in from Chrome on macOS",
  "Your subscription renews in 3 days",
  "Action required: confirm your account",
  "Receipt for your payment",
  "{org} product update: November release",
  "Your two-factor code is {n}",
]

const SMTP_RESPONSES: Record<DeliveryStatus, { code: number; text: string }[]> = {
  delivered: [{ code: 250, text: "2.0.0 OK: queued as {id}" }],
  bounced: [
    { code: 550, text: "5.1.1 The email account that you tried to reach does not exist" },
    { code: 552, text: "5.2.2 Mailbox full; recipient is over quota" },
    { code: 553, text: "5.1.3 Invalid recipient address syntax" },
  ],
  deferred: [
    { code: 421, text: "4.7.0 Temporary system problem. Try again later" },
    { code: 451, text: "4.7.1 Greylisted, please retry in 300 seconds" },
    { code: 452, text: "4.2.2 Mailbox temporarily over quota" },
  ],
  queued: [{ code: 0, text: "Awaiting delivery attempt" }],
  rejected: [{ code: 554, text: "5.7.1 Message rejected due to content policy" }],
}

const emailCache = new Map<string, EmailEvent[]>()

function pickStatus(r: number): DeliveryStatus {
  if (r < 0.9) return "delivered"
  if (r < 0.945) return "bounced"
  if (r < 0.975) return "deferred"
  if (r < 0.99) return "queued"
  return "rejected"
}

function getEmails(orgId: string): EmailEvent[] {
  const cached = emailCache.get(orgId)
  if (cached) return cached
  const org = getOrg(orgId)
  const rand = mulberry32(org.seed * 13)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const now = Date.now()
  const events: EmailEvent[] = Array.from({ length: 320 }, (_, i) => {
    const status = pickStatus(rand())
    const response = pick(SMTP_RESPONSES[status])
    const id = Math.floor(rand() * 0xffffffff).toString(16).toUpperCase()
    const n = String(Math.floor(10000 + rand() * 89999))
    // Skew recent: most events in the last few days.
    const ageMs = Math.pow(rand(), 2.2) * 30 * DAY
    return {
      id: `evt_${org.slug}_${i}`,
      messageId: `<${id.toLowerCase()}.${i}@mta.mailops.io>`,
      recipient: `${pick(FIRST_NAMES)}.${pick(LAST_NAMES)}@${pick(RECIPIENT_DOMAINS)}`,
      sender: `${pick(SENDERS)}@${org.domain}`,
      subject: pick(SUBJECTS).replace("{n}", n).replace("{org}", org.name.split(" ")[0]),
      timestamp: new Date(now - ageMs).toISOString(),
      status,
      smtpCode: response.code,
      smtpResponse: response.text.replace("{id}", id),
      ip: `198.51.100.${10 + Math.floor(rand() * 40)}`,
      attempts: status === "deferred" ? 1 + Math.floor(rand() * 4) : status === "queued" ? 0 : 1,
    }
  }).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  emailCache.set(orgId, events)
  return events
}

export async function listEmails(orgId: string, query: EmailQuery): Promise<Paginated<EmailEvent>> {
  await delay()
  const rangeMs = { "24h": DAY, "7d": 7 * DAY, "30d": 30 * DAY }[query.range ?? "30d"]
  const cutoff = Date.now() - rangeMs
  const search = query.search?.trim().toLowerCase()
  const filtered = getEmails(orgId).filter((e) => {
    if (new Date(e.timestamp).getTime() < cutoff) return false
    if (query.status && query.status !== "all" && e.status !== query.status) return false
    if (search) {
      return [e.recipient, e.sender, e.subject, e.messageId, String(e.smtpCode)].some((v) => v.toLowerCase().includes(search))
    }
    return true
  })
  const start = (query.page - 1) * query.pageSize
  return { items: filtered.slice(start, start + query.pageSize), total: filtered.length, page: query.page, pageSize: query.pageSize }
}

/* -------------------------------- Analytics --------------------------------- */

const PROVIDER_SHARES = [
  { provider: "Gmail", share: 0.46, bounce: 0.011 },
  { provider: "Outlook / Hotmail", share: 0.22, bounce: 0.019 },
  { provider: "Yahoo Mail", share: 0.11, bounce: 0.024 },
  { provider: "Apple iCloud", share: 0.09, bounce: 0.008 },
  { provider: "Proton Mail", share: 0.04, bounce: 0.006 },
  { provider: "Corporate / Other", share: 0.08, bounce: 0.031 },
]

export async function getAnalytics(orgId: string, days = 30): Promise<AnalyticsData> {
  await delay()
  const org = getOrg(orgId)
  const daily = getTraffic(orgId, 90).slice(-days)
  const totals = sumTraffic(daily)
  const providers = PROVIDER_SHARES.map((p) => {
    const sent = Math.round(totals.sent * p.share)
    const bounced = Math.round(sent * p.bounce)
    const delivered = sent - bounced - Math.round(sent * 0.006)
    return { provider: p.provider, sent, bounced, delivered, deliveryRate: Math.round((delivered / sent) * 10000) / 100 }
  })
  const rand = mulberry32(org.seed * 5)
  const volume = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (11 - i))
    return {
      month: d.toLocaleString("en-US", { month: "short" }),
      volume: Math.round(org.scale * 26 * (0.62 + i * 0.04) * (0.9 + rand() * 0.2)),
    }
  })
  const peak = daily.reduce((max, d) => (d.sent > max.sent ? d : max), daily[0])
  return {
    daily,
    bounceRate: daily.map((d) => ({ date: d.date, rate: Math.round((d.bounced / d.sent) * 10000) / 100 })),
    providers,
    volume,
    summary: {
      avgDeliveryRate: Math.round((totals.delivered / totals.sent) * 10000) / 100,
      avgBounceRate: Math.round((totals.bounced / totals.sent) * 10000) / 100,
      peakDay: peak.date,
      peakVolume: peak.sent,
    },
  }
}

/* ----------------------------------- SMTP ----------------------------------- */

const smtpStore = new Map<string, SmtpConfig>()

function getSmtp(orgId: string) {
  let config = smtpStore.get(orgId)
  if (!config) {
    const org = getOrg(orgId)
    config = {
      hostname: "smtp.mailops.io",
      ports: [
        { port: 587, security: "STARTTLS (recommended)" },
        { port: 465, security: "Implicit TLS / SSL" },
        { port: 2525, security: "STARTTLS (alternate)" },
        { port: 25, security: "STARTTLS (server-to-server)" },
      ],
      username: `mo_${org.slug}_smtp`,
      password: `mo_smtp_${randomToken(28)}`,
      tls: { mode: "starttls", minVersion: "1.2", requireTls: true },
    }
    smtpStore.set(orgId, config)
  }
  return config
}

export async function getSmtpConfig(orgId: string) {
  await delay()
  return structuredClone(getSmtp(orgId))
}

export async function updateSmtpTls(orgId: string, tls: SmtpConfig["tls"]) {
  await delay(500)
  const config = getSmtp(orgId)
  config.tls = { ...tls }
  return structuredClone(config)
}

export async function rotateSmtpPassword(orgId: string) {
  await delay(600)
  const config = getSmtp(orgId)
  config.password = `mo_smtp_${randomToken(28)}`
  return structuredClone(config)
}

/* --------------------------------- API keys --------------------------------- */

const keyStore = new Map<string, ApiKey[]>()

function getKeys(orgId: string) {
  let keys = keyStore.get(orgId)
  if (!keys) {
    const org = getOrg(orgId)
    const base = org.scale / 42_000
    keys = [
      { id: "key_1", name: "Production — transactional", prefix: "mo_live_8fK2", scopes: ["mail.send", "stats.read"], createdAt: isoDay(182), lastUsedAt: new Date(Date.now() - 4 * 60_000).toISOString(), status: "active", requests30d: Math.round(1_284_220 * base) },
      { id: "key_2", name: "Marketing automation", prefix: "mo_live_Qa71", scopes: ["mail.send"], createdAt: isoDay(96), lastUsedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), status: "active", requests30d: Math.round(412_908 * base) },
      { id: "key_3", name: "Analytics dashboard (read-only)", prefix: "mo_live_Zt3c", scopes: ["stats.read"], createdAt: isoDay(41), lastUsedAt: new Date(Date.now() - DAY).toISOString(), status: "active", requests30d: Math.round(18_442 * base) },
      { id: "key_4", name: "Staging", prefix: "mo_test_Lm90", scopes: ["mail.send", "stats.read", "domains.manage"], createdAt: isoDay(220), lastUsedAt: isoDay(64), status: "revoked", requests30d: 0 },
    ]
    keyStore.set(orgId, keys)
  }
  return keys
}

export async function listApiKeys(orgId: string) {
  await delay()
  return structuredClone(getKeys(orgId))
}

export async function createApiKey(orgId: string, input: { name: string; scopes: ApiScope[] }): Promise<CreatedApiKey> {
  await delay(600)
  const live = randomToken(40)
  const key: ApiKey = {
    id: `key_${randomToken(8)}`,
    name: input.name,
    prefix: `mo_live_${live.slice(0, 4)}`,
    scopes: input.scopes,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    status: "active",
    requests30d: 0,
  }
  getKeys(orgId).unshift(key)
  return { key: structuredClone(key), secret: `mo_live_${live}` }
}

export async function revokeApiKey(orgId: string, keyId: string) {
  await delay(450)
  const key = getKeys(orgId).find((k) => k.id === keyId)
  if (!key) throw new ApiError("API key not found", 404)
  key.status = "revoked"
  return structuredClone(key)
}

export async function getApiUsage(orgId: string): Promise<ApiUsage> {
  await delay()
  const traffic = getTraffic(orgId, 90).slice(-30)
  const rand = mulberry32(getOrg(orgId).seed * 3)
  const daily = traffic.map((t) => {
    const requests = Math.round(t.sent * 1.08)
    return { date: t.date, requests, errors: Math.round(requests * (0.002 + rand() * 0.006)) }
  })
  const totalRequests = daily.reduce((s, d) => s + d.requests, 0)
  const errors = daily.reduce((s, d) => s + d.errors, 0)
  return {
    daily,
    totalRequests,
    errorRate: Math.round((errors / totalRequests) * 10000) / 100,
    avgLatencyMs: 84 + Math.round(rand() * 30),
    topEndpoints: [
      { method: "POST", endpoint: "/v1/mail/send", requests: Math.round(totalRequests * 0.81) },
      { method: "POST", endpoint: "/v1/mail/batch", requests: Math.round(totalRequests * 0.11) },
      { method: "GET", endpoint: "/v1/stats", requests: Math.round(totalRequests * 0.05) },
      { method: "GET", endpoint: "/v1/events", requests: Math.round(totalRequests * 0.025) },
      { method: "GET", endpoint: "/v1/domains", requests: Math.round(totalRequests * 0.005) },
    ],
  }
}

/* ---------------------------------- Domains --------------------------------- */

const domainStore = new Map<string, Domain[]>()

function buildDomain(name: string, status: Domain["status"], createdAt: string, overrides: Partial<Record<"spf" | "dkim" | "dmarc", Domain["status"]>> = {}): Domain {
  const record = (s?: Domain["status"]) => s ?? status
  return {
    id: `dom_${name.replace(/\W/g, "_")}`,
    name,
    status,
    createdAt,
    spf: { type: "TXT", host: name, value: "v=spf1 include:_spf.mailops.io ~all", status: record(overrides.spf) },
    dkim: { type: "CNAME", host: `mo1._domainkey.${name}`, value: "mo1.dkim.mailops.io", status: record(overrides.dkim) },
    dmarc: { type: "TXT", host: `_dmarc.${name}`, value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${name}; pct=100`, status: record(overrides.dmarc) },
  }
}

function getDomains(orgId: string) {
  let domains = domainStore.get(orgId)
  if (!domains) {
    const org = getOrg(orgId)
    domains = [
      buildDomain(org.domain, "verified", isoDay(210)),
      buildDomain(`mail.${org.domain}`, "verified", isoDay(150)),
      buildDomain(`news.${org.domain}`, "pending", isoDay(2), { spf: "verified", dkim: "pending", dmarc: "pending" }),
      buildDomain(`legacy-${org.slug}.com`, "failed", isoDay(30), { spf: "verified", dkim: "failed", dmarc: "failed" }),
    ]
    domainStore.set(orgId, domains)
  }
  return domains
}

export async function listDomains(orgId: string) {
  await delay()
  return structuredClone(getDomains(orgId))
}

export async function addDomain(orgId: string, name: string) {
  await delay(600)
  const normalized = name.trim().toLowerCase()
  if (!/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(normalized)) throw new ApiError("Enter a valid domain name, e.g. mail.example.com", 422)
  const domains = getDomains(orgId)
  if (domains.some((d) => d.name === normalized)) throw new ApiError("This domain has already been added", 409)
  const domain = buildDomain(normalized, "pending", new Date().toISOString())
  domains.unshift(domain)
  return structuredClone(domain)
}

export async function verifyDomain(orgId: string, domainId: string) {
  await delay(1200)
  const domain = getDomains(orgId).find((d) => d.id === domainId)
  if (!domain) throw new ApiError("Domain not found", 404)
  // Demo behaviour: domains containing "legacy" keep failing DKIM; others propagate successfully.
  const failing = domain.name.includes("legacy")
  domain.spf.status = "verified"
  domain.dkim.status = failing ? "failed" : "verified"
  domain.dmarc.status = failing ? "failed" : "verified"
  domain.status = failing ? "failed" : "verified"
  return structuredClone(domain)
}

export async function deleteDomain(orgId: string, domainId: string) {
  await delay(450)
  const domains = getDomains(orgId)
  const index = domains.findIndex((d) => d.id === domainId)
  if (index === -1) throw new ApiError("Domain not found", 404)
  domains.splice(index, 1)
}

/* ----------------------------------- Usage ---------------------------------- */

export async function getUsage(orgId: string): Promise<UsageQuota> {
  await delay()
  const org = getOrg(orgId)
  const quotas = { Starter: [50_000, 2_500], Growth: [500_000, 25_000], Enterprise: [1_500_000, 75_000] }
  const [monthlyQuota, dailyLimit] = quotas[org.plan]
  const now = new Date()
  const dayOfMonth = now.getDate()
  const traffic = getTraffic(orgId, 90).slice(-dayOfMonth)
  const daily = traffic.map((t) => ({ date: t.date, sent: t.sent }))
  const monthlyUsed = daily.reduce((s, d) => s + d.sent, 0)
  const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    plan: org.plan,
    monthlyQuota,
    monthlyUsed,
    dailyLimit,
    dailyUsed: Math.round((daily.at(-1)?.sent ?? 0) * (now.getHours() / 24 + 0.15)),
    resetDate: reset.toISOString(),
    daily,
  }
}

/* --------------------------------- Accounts --------------------------------- */

export async function listOrganizations() {
  await delay(250)
  return ORGANIZATIONS.map(({ id, name, slug, plan }) => ({ id, name, slug, plan }))
}

export async function getCurrentUser() {
  await delay(200)
  return { ...CURRENT_USER }
}

const memberStore = new Map<string, Member[]>()

function getMembers(orgId: string) {
  let members = memberStore.get(orgId)
  if (!members) {
    const org = getOrg(orgId)
    members = [
      { id: "mem_1", name: CURRENT_USER.name, email: CURRENT_USER.email, role: "owner", status: "active", lastActive: new Date().toISOString() },
      { id: "mem_2", name: "Marcus Oyelaran", email: `marcus@${org.domain}`, role: "admin", status: "active", lastActive: new Date(Date.now() - 3 * 3_600_000).toISOString() },
      { id: "mem_3", name: "Priya Raman", email: `priya@${org.domain}`, role: "developer", status: "active", lastActive: new Date(Date.now() - DAY).toISOString() },
      { id: "mem_4", name: "Tomás Lindqvist", email: `tomas@${org.domain}`, role: "developer", status: "active", lastActive: isoDay(6) },
      { id: "mem_5", name: "Grace Whitfield", email: `grace@${org.domain}`, role: "viewer", status: "active", lastActive: isoDay(12) },
      { id: "mem_6", name: "", email: `devops@${org.domain}`, role: "developer", status: "invited", lastActive: null },
    ]
    memberStore.set(orgId, members)
  }
  return members
}

export async function listMembers(orgId: string) {
  await delay()
  return structuredClone(getMembers(orgId))
}

export async function inviteMember(orgId: string, input: { email: string; role: MemberRole }) {
  await delay(500)
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("Enter a valid email address", 422)
  const members = getMembers(orgId)
  if (members.some((m) => m.email === email)) throw new ApiError("This person is already a member", 409)
  const member: Member = { id: `mem_${randomToken(6)}`, name: "", email, role: input.role, status: "invited", lastActive: null }
  members.push(member)
  return structuredClone(member)
}

export async function updateMemberRole(orgId: string, memberId: string, role: MemberRole) {
  await delay(400)
  const member = getMembers(orgId).find((m) => m.id === memberId)
  if (!member) throw new ApiError("Member not found", 404)
  if (member.role === "owner") throw new ApiError("The organization owner's role cannot be changed", 403)
  member.role = role
  return structuredClone(member)
}

export async function removeMember(orgId: string, memberId: string) {
  await delay(400)
  const members = getMembers(orgId)
  const member = members.find((m) => m.id === memberId)
  if (!member) throw new ApiError("Member not found", 404)
  if (member.role === "owner") throw new ApiError("The organization owner cannot be removed", 403)
  members.splice(members.indexOf(member), 1)
}

const settingsStore = new Map<string, OrgSettings>()
const securityStore = new Map<string, SecuritySettings>()

function getSettings(orgId: string) {
  let s = settingsStore.get(orgId)
  if (!s) {
    const org = getOrg(orgId)
    s = { name: org.name, slug: org.slug, timezone: "America/New_York", defaultSender: `notifications@${org.domain}`, trackOpens: true, trackClicks: false }
    settingsStore.set(orgId, s)
  }
  return s
}

function getSecurity(orgId: string) {
  let s = securityStore.get(orgId)
  if (!s) {
    s = { twoFactorEnforced: true, sessionTimeoutMinutes: 60, ipAllowlist: ["203.0.113.0/24", "198.51.100.14"], ssoEnabled: getOrg(orgId).plan === "Enterprise" }
    securityStore.set(orgId, s)
  }
  return s
}

export async function getOrgSettings(orgId: string) {
  await delay()
  return { ...getSettings(orgId) }
}

export async function updateOrgSettings(orgId: string, input: OrgSettings) {
  await delay(500)
  if (!input.name.trim()) throw new ApiError("Organization name is required", 422)
  settingsStore.set(orgId, { ...input })
  return { ...input }
}

export async function getSecuritySettings(orgId: string) {
  await delay()
  return structuredClone(getSecurity(orgId))
}

export async function updateSecuritySettings(orgId: string, input: SecuritySettings) {
  await delay(500)
  securityStore.set(orgId, structuredClone(input))
  return structuredClone(input)
}
