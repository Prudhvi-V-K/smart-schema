"use client"

import { Database, GitBranch, Download, Settings,Brain } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  activeTab: "generator" | "diagram" | "scripts" | "export"
  onTabChange: (tab: "generator" | "diagram" | "scripts" | "export") => void
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const tabs = [
    { id: "generator", label: "Generator", icon: Database },
    { id: "diagram", label: "ER Diagram", icon: GitBranch },
    { id: "scripts", label: "Scripts", icon: Settings },
    { id: "export", label: "Explanation", icon: Brain },
  ]

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      <nav className="flex-1 p-4 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => onTabChange(tab.id as any)}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Button>
          )
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">v0.1.0</p>
      </div>
    </aside>
  )
}
