"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/dashboard/page-header"
import { OrganizationSettings } from "./organization-settings"
import { SecuritySettingsPanel } from "./security-settings"
import { TeamMembers } from "./team-members"

export function SettingsView() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your organization profile, team access and security policies." />
      <Tabs defaultValue="team" className="gap-6">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="team">
          <TeamMembers />
        </TabsContent>
        <TabsContent value="organization">
          <OrganizationSettings />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettingsPanel />
        </TabsContent>
      </Tabs>
    </>
  )
}
