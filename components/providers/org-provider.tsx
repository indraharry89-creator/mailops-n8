"use client"

import { createContext, useContext, useMemo, useState } from "react"
import useSWR from "swr"
import { api } from "@/lib/api/services"
import type { CurrentUser, Organization } from "@/lib/api/types"

interface OrgContextValue {
  orgId: string
  organizations: Organization[]
  currentOrg: Organization | undefined
  user: CurrentUser | undefined
  setOrgId: (id: string) => void
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgId] = useState("org_acme")
  const { data: organizations = [] } = useSWR("organizations", api.listOrganizations)
  const { data: user } = useSWR("me", api.getCurrentUser)

  const value = useMemo<OrgContextValue>(
    () => ({
      orgId,
      organizations,
      currentOrg: organizations.find((o) => o.id === orgId),
      user,
      setOrgId,
    }),
    [orgId, organizations, user],
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrg must be used within OrgProvider")
  return ctx
}
