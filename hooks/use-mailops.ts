"use client"

import useSWR from "swr"
import { useOrg } from "@/components/providers/org-provider"
import { api } from "@/lib/api/services"
import type { EmailQuery } from "@/lib/api/types"

export function useOverview(days = 30) {
  const { orgId } = useOrg()
  return useSWR(["overview", orgId, days], () => api.getOverview(orgId, days))
}

export function useEmails(query: EmailQuery) {
  const { orgId } = useOrg()
  return useSWR(["emails", orgId, JSON.stringify(query)], () => api.listEmails(orgId, query), {
    keepPreviousData: true,
  })
}

export function useAnalytics(days = 30) {
  const { orgId } = useOrg()
  return useSWR(["analytics", orgId, days], () => api.getAnalytics(orgId, days))
}

export function useSmtpConfig() {
  const { orgId } = useOrg()
  return useSWR(["smtp", orgId], () => api.getSmtpConfig(orgId))
}

export function useApiKeys() {
  const { orgId } = useOrg()
  return useSWR(["api-keys", orgId], () => api.listApiKeys(orgId))
}

export function useApiUsage() {
  const { orgId } = useOrg()
  return useSWR(["api-usage", orgId], () => api.getApiUsage(orgId))
}

export function useDomains() {
  const { orgId } = useOrg()
  return useSWR(["domains", orgId], () => api.listDomains(orgId))
}

export function useUsage() {
  const { orgId } = useOrg()
  return useSWR(["usage", orgId], () => api.getUsage(orgId))
}

export function useMembers() {
  const { orgId } = useOrg()
  return useSWR(["members", orgId], () => api.listMembers(orgId))
}

export function useOrgSettings() {
  const { orgId } = useOrg()
  return useSWR(["org-settings", orgId], () => api.getOrgSettings(orgId))
}

export function useSecuritySettings() {
  const { orgId } = useOrg()
  return useSWR(["security-settings", orgId], () => api.getSecuritySettings(orgId))
}
