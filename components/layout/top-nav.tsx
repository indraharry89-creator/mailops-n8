"use client"

import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { findNavItem } from "@/lib/navigation"
import { OrgSwitcher } from "./org-switcher"
import { UserMenu } from "./user-menu"

export function TopNav() {
  const pathname = usePathname()
  const current = findNavItem(pathname)

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-card/90 px-4 backdrop-blur supports-backdrop-filter:bg-card/75 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-5 data-vertical:self-center" />
      <div className="hidden min-w-0 flex-col sm:flex">
        <span className="truncate text-sm font-semibold">{current?.title ?? "MailOps"}</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5 md:gap-3">
        <OrgSwitcher />
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications, 3 unread">
          <Bell />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-card" aria-hidden="true" />
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}
