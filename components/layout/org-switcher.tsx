"use client"

import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrg } from "@/components/providers/org-provider"

export function OrgSwitcher() {
  const { organizations, currentOrg, orgId, setOrgId } = useOrg()

  if (!currentOrg) return <Skeleton className="h-9 w-40" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="h-9 max-w-52 gap-2 px-2.5" aria-label="Switch organization" />}
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-semibold text-primary-foreground">
          {currentOrg.name.charAt(0)}
        </span>
        <span className="hidden truncate sm:inline">{currentOrg.name}</span>
        <ChevronsUpDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem key={org.id} onClick={() => setOrgId(org.id)} className="gap-2">
              <Building2 className="text-muted-foreground" />
              <span className="flex-1 truncate">{org.name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {org.plan}
              </Badge>
              {org.id === orgId ? <Check aria-label="Current organization" /> : <span className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast.info("Organization creation is handled by your MailOps admin.")}>
          <Plus />
          Create organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
