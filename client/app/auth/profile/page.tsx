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
    <div className="min-h-screen bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 border-b border-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Account
          </p>
          <h1 className="mt-2 page-title">Profile</h1>
        </div>
      <Card className="w-full max-w-xl gap-5 border-border p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
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
    </div>
  )
}
