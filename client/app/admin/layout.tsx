"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, FileText, KeyRound, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/utils"

const adminNavigation = [
  { label: "Question Papers", href: "/admin/questions", icon: FileText },
  { label: "Security Code", href: "/admin/security", icon: KeyRound },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={cn("min-h-screen bg-background transition-[padding] duration-200", isCollapsed ? "md:pl-20" : "md:pl-64")}>
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card transition-[width] duration-200 md:flex", isCollapsed ? "w-20" : "w-64")}>
        <div className={cn("flex h-[76px] items-center border-b border-border", isCollapsed ? "justify-center px-3" : "gap-3 px-6")}>
          <span className="flex size-9 items-center justify-center bg-primary text-primary-foreground">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          {!isCollapsed && <span className="min-w-0">
            <span className="block text-sm font-bold tracking-tight text-foreground">eAssessment</span>
            <span className="block text-xs text-muted-foreground">Staff workspace</span>
          </span>}
        </div>
        <nav aria-label="Admin navigation" className={cn("flex-1 space-y-1 py-6", isCollapsed ? "px-2" : "px-3")}>
          {!isCollapsed && <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Workspace
          </p>}
          {adminNavigation.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-3 px-3 text-sm font-medium transition-colors",
                  isCollapsed && "justify-center px-0",
                  isActive
                    ? "bg-accent text-accent-foreground before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {!isCollapsed && label}
                {isCollapsed && <span className="sr-only">{label}</span>}
              </Link>
            )
          })}
        </nav>
        <div className={cn("border-t border-border", isCollapsed ? "p-2" : "p-5")}>
          <button
            type="button"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            className={cn("flex h-10 w-full items-center gap-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isCollapsed ? "justify-center" : "px-3")}
          >
            {isCollapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden="true" /> : <PanelLeftClose className="size-[18px]" aria-hidden="true" />}
            {!isCollapsed && "Collapse sidebar"}
          </button>
        </div>
      </aside>

      <div className="min-h-screen">
        <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {adminNavigation.map(({ label, href }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 px-3 py-2 text-sm font-medium",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        {children}
      </div>
    </div>
  )
}
