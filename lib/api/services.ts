import { http, USE_MOCK } from "./client"
import * as mock from "./mock"
import type {
  AnalyticsData,
  ApiKey,
  ApiScope,
  ApiUsage,
  CreatedApiKey,
  CurrentUser,
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

/**
 * Service layer. Each function maps 1:1 to a FastAPI route under /v1.
 * When NEXT_PUBLIC_API_BASE_URL is unset the in-browser mock is used instead.
 */

const org = (orgId: string) => `/v1/orgs/${encodeURIComponent(orgId)}`

export const api = {
  listOrganizations: (): Promise<Organization[]> =>
    USE_MOCK ? mock.listOrganizations() : http("GET", "/v1/orgs"),

  getCurrentUser: (): Promise<CurrentUser> => (USE_MOCK ? mock.getCurrentUser() : http("GET", "/v1/me")),

  getOverview: (orgId: string, days = 30): Promise<OverviewStats> =>
    USE_MOCK ? mock.getOverview(orgId, days) : http("GET", `${org(orgId)}/stats/overview`, { query: { days } }),

  listEmails: (orgId: string, query: EmailQuery): Promise<Paginated<EmailEvent>> =>
    USE_MOCK ? mock.listEmails(orgId, query) : http("GET", `${org(orgId)}/emails`, { query: { ...query } }),

  getAnalytics: (orgId: string, days = 30): Promise<AnalyticsData> =>
    USE_MOCK ? mock.getAnalytics(orgId, days) : http("GET", `${org(orgId)}/analytics`, { query: { days } }),

  getSmtpConfig: (orgId: string): Promise<SmtpConfig> =>
    USE_MOCK ? mock.getSmtpConfig(orgId) : http("GET", `${org(orgId)}/smtp`),

  updateSmtpTls: (orgId: string, tls: SmtpConfig["tls"]): Promise<SmtpConfig> =>
    USE_MOCK ? mock.updateSmtpTls(orgId, tls) : http("PATCH", `${org(orgId)}/smtp/tls`, { body: tls }),

  rotateSmtpPassword: (orgId: string): Promise<SmtpConfig> =>
    USE_MOCK ? mock.rotateSmtpPassword(orgId) : http("POST", `${org(orgId)}/smtp/rotate-password`),

  listApiKeys: (orgId: string): Promise<ApiKey[]> =>
    USE_MOCK ? mock.listApiKeys(orgId) : http("GET", `${org(orgId)}/api-keys`),

  createApiKey: (orgId: string, input: { name: string; scopes: ApiScope[] }): Promise<CreatedApiKey> =>
    USE_MOCK ? mock.createApiKey(orgId, input) : http("POST", `${org(orgId)}/api-keys`, { body: input }),

  revokeApiKey: (orgId: string, keyId: string): Promise<ApiKey> =>
    USE_MOCK ? mock.revokeApiKey(orgId, keyId) : http("POST", `${org(orgId)}/api-keys/${keyId}/revoke`),

  getApiUsage: (orgId: string): Promise<ApiUsage> =>
    USE_MOCK ? mock.getApiUsage(orgId) : http("GET", `${org(orgId)}/api-keys/usage`),

  listDomains: (orgId: string): Promise<Domain[]> =>
    USE_MOCK ? mock.listDomains(orgId) : http("GET", `${org(orgId)}/domains`),

  addDomain: (orgId: string, name: string): Promise<Domain> =>
    USE_MOCK ? mock.addDomain(orgId, name) : http("POST", `${org(orgId)}/domains`, { body: { name } }),

  verifyDomain: (orgId: string, domainId: string): Promise<Domain> =>
    USE_MOCK ? mock.verifyDomain(orgId, domainId) : http("POST", `${org(orgId)}/domains/${domainId}/verify`),

  deleteDomain: (orgId: string, domainId: string): Promise<void> =>
    USE_MOCK ? mock.deleteDomain(orgId, domainId) : http("DELETE", `${org(orgId)}/domains/${domainId}`),

  getUsage: (orgId: string): Promise<UsageQuota> =>
    USE_MOCK ? mock.getUsage(orgId) : http("GET", `${org(orgId)}/usage`),

  listMembers: (orgId: string): Promise<Member[]> =>
    USE_MOCK ? mock.listMembers(orgId) : http("GET", `${org(orgId)}/members`),

  inviteMember: (orgId: string, input: { email: string; role: MemberRole }): Promise<Member> =>
    USE_MOCK ? mock.inviteMember(orgId, input) : http("POST", `${org(orgId)}/members`, { body: input }),

  updateMemberRole: (orgId: string, memberId: string, role: MemberRole): Promise<Member> =>
    USE_MOCK ? mock.updateMemberRole(orgId, memberId, role) : http("PATCH", `${org(orgId)}/members/${memberId}`, { body: { role } }),

  removeMember: (orgId: string, memberId: string): Promise<void> =>
    USE_MOCK ? mock.removeMember(orgId, memberId) : http("DELETE", `${org(orgId)}/members/${memberId}`),

  getOrgSettings: (orgId: string): Promise<OrgSettings> =>
    USE_MOCK ? mock.getOrgSettings(orgId) : http("GET", `${org(orgId)}/settings`),

  updateOrgSettings: (orgId: string, input: OrgSettings): Promise<OrgSettings> =>
    USE_MOCK ? mock.updateOrgSettings(orgId, input) : http("PATCH", `${org(orgId)}/settings`, { body: input }),

  getSecuritySettings: (orgId: string): Promise<SecuritySettings> =>
    USE_MOCK ? mock.getSecuritySettings(orgId) : http("GET", `${org(orgId)}/settings/security`),

  updateSecuritySettings: (orgId: string, input: SecuritySettings): Promise<SecuritySettings> =>
    USE_MOCK ? mock.updateSecuritySettings(orgId, input) : http("PATCH", `${org(orgId)}/settings/security`, { body: input }),
}
