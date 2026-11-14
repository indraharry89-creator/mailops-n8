import {
  Activity,
  BarChart3,
  Gauge,
  Globe,
  KeyRound,
  LayoutDashboard,
  Server,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  description: string
}

export const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Monitor",
    items: [
      { title: "Overview", href: "/", icon: LayoutDashboard, description: "Delivery performance at a glance" },
      { title: "Email Activity", href: "/activity", icon: Activity, description: "Search and inspect individual messages" },
      { title: "Analytics", href: "/analytics", icon: BarChart3, description: "Deliverability trends and provider insights" },
    ],
  },
  {
    label: "Configure",
    items: [
      { title: "SMTP Configuration", href: "/smtp", icon: Server, description: "Relay credentials and TLS settings" },
      { title: "API Keys", href: "/api-keys", icon: KeyRound, description: "Manage keys and monitor API usage" },
      { title: "Domains", href: "/domains", icon: Globe, description: "Sending domains and DNS authentication" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Usage & Quota", href: "/usage", icon: Gauge, description: "Plan limits and consumption" },
      { title: "Settings", href: "/settings", icon: Settings, description: "Team, organization and security" },
    ],
  },
]

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items)

export function findNavItem(pathname: string) {
  return NAV_ITEMS.find((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)))
}
