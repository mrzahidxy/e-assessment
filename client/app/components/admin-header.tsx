"use client"

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface AdminHeaderProps {
  title?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AdminHeader({
  title = 'e-Assessment Platform',
  activeTab,
  onTabChange,
}: AdminHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between ${activeTab !== undefined ? "mb-4" : ""}`}>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">{user?.name || 'Admin'}</p>
            {title && <h1 className="page-title">{title}</h1>}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleLogout} aria-label="Log out">
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>

        {activeTab !== undefined && (
          <div className="flex gap-1">
            {['Question Builder', 'Access Requests', 'Review Answers'].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange?.(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </header>
  );
}
