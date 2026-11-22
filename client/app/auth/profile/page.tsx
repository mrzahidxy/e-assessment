"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import { useAuthStore } from "@/lib/auth-store"

export default function ProfilePage() {
  const { user, isLoading, checkAuth } = useAuthStore()
  const checkedAuth = useRef(false)
  const [hasResolvedAuth, setHasResolvedAuth] = useState(false)

  useEffect(() => {
    if (user) {
      setHasResolvedAuth(true)
      return
    }
    if (isLoading || checkedAuth.current) return
    checkedAuth.current = true
    void checkAuth().finally(() => setHasResolvedAuth(true))
  }, [checkAuth, isLoading, user])

  if (isLoading || !hasResolvedAuth) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <StatePanel kind="loading" title="Loading profile" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <StatePanel
          kind="empty"
          title="Profile unavailable"
          description="Sign in to view your account details."
          action={
            <Button asChild size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          }
        />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Profile</p>
            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {user.role}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">User ID</p>
            <p className="font-semibold text-foreground break-all">{user.id}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">Role</p>
            <p className="font-semibold text-foreground capitalize">{user.role}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
