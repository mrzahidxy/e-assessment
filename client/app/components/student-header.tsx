"use client"

import Link from "next/link"
import { usePathname, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { GraduationCap, LogOut } from "lucide-react"
import { useAuthStore } from '@/lib/auth-store';

interface StudentHeaderProps {
  studentName?: string
  schoolCode?: string
}

export function StudentHeader({ studentName, schoolCode }: StudentHeaderProps) {
  const router = useRouter();
  const pathname = usePathname()
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const displayName = studentName || user?.name || 'Student';
  const displaySchoolCode = schoolCode || user?.schoolCode || 'N/A';

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center bg-primary text-primary-foreground">
                <GraduationCap className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold tracking-tight text-foreground">eAssessment</span>
            </div>
            <nav aria-label="Student navigation" className="flex items-center gap-1">
              <Link
                href="/student/assessments"
                aria-current={pathname === "/student/assessments" ? "page" : undefined}
                className={`px-3 py-2 text-sm font-medium ${pathname === "/student/assessments" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                Assessments
              </Link>
              <Link
                href="/student/feedback"
                aria-current={pathname.startsWith("/student/feedback") ? "page" : undefined}
                className={`px-3 py-2 text-sm font-medium ${pathname.startsWith("/student/feedback") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                Feedback
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground">
                School Code: {displaySchoolCode}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} aria-label="Log out">
              <LogOut className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
