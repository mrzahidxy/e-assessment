"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { StatePanel } from "@/components/ui/state-panel"
import { PageShell } from "@/components/ui/page-shell"
import { FileText, Plus, ShieldAlert } from "lucide-react"
import { useQuestions } from "@/hooks/queries/useQuestions"
import { formatStatusLabel, getStatusVariant } from "@/lib/helpers/questions"
import type { PaperRecord } from "@/types/questions"

const PAGE_SIZE = 10

export default function AdminPapersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error, refetch } = useQuestions({ page, limit: PAGE_SIZE })
  const papers = (data?.data ?? []) as PaperRecord[]
  const meta = data?.meta ?? {
    page,
    limit: PAGE_SIZE,
    totalItems: papers.length,
    totalPages: Math.max(1, Math.ceil(papers.length / PAGE_SIZE)),
  }

  const totalPages = Math.max(1, meta.totalPages ?? 1)
  const canGoPrev = meta.page > 1
  const canGoNext = meta.page < totalPages

  const handlePrev = () => {
    if (canGoPrev) setPage((prev) => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    if (canGoNext) setPage((prev) => prev + 1)
  }

  const startItem = meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.limit + 1
  const endItem =
    meta.totalItems === 0 ? 0 : Math.min(meta.totalItems, (meta.page - 1) * meta.limit + papers.length)

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Question Papers" />

      <PageShell width="compact">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="page-title">All Papers</h1>
            <p className="page-description">Create, view, and manage assessments</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/security">
              <Button variant="outline" size="sm" className="gap-2">
                <ShieldAlert className="w-3 h-3" />
                Security
              </Button>
            </Link>
            <Link href="/admin/questions/create-paper">
              <Button size="sm" className="gap-2">
                <Plus className="w-3 h-3" />
                Create
              </Button>
            </Link>
          </div>
        </div>

        {isLoading && (
          <StatePanel
            kind="loading"
            title="Loading question papers"
            className="mb-4"
          />
        )}
        {isError && (
          <StatePanel
            kind="error"
            title="Couldn’t load question papers"
            description={error instanceof Error ? error.message : "Please try again."}
            action={
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Try again
              </Button>
            }
            className="mb-4"
          />
        )}
        {!isLoading && !isError && papers.length === 0 && (
          <StatePanel
            kind="empty"
            title="No question papers yet"
            description="Create your first paper to get started."
            action={
              <Button size="sm" className="gap-2" asChild>
                <Link href="/admin/questions/create-paper">
                  <Plus className="w-3 h-3" />
                  Create question paper
                </Link>
              </Button>
            }
          />
        )}

        {papers.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {papers.map((paper) => {
                const statusLabel = formatStatusLabel(paper.status)
                const description = paper.description ?? "General"
                const questionCount = paper._count?.questions ?? "—"

                return (
                  <Card
                    key={paper.id}
                    className="flex flex-col gap-3 p-4 transition hover:border-primary/40 hover:shadow-md sm:p-5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 break-words text-base font-semibold text-foreground">
                          {paper.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
                          {description} • {questionCount} questions
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <Badge variant={getStatusVariant(paper.status)}>
                        {statusLabel}
                      </Badge>
                      <div className="ml-auto flex items-center gap-2">
                        <Link href={`/admin/questions/edit-paper/${paper.id}`}>
                          <Button size="sm" title="Edit paper details">
                            Edit
                          </Button>
                        </Link>
                        <Link href={`/admin/questions/${paper.id}`}>
                          <Button size="sm" variant="outline" title="View paper">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {startItem}-{endItem} of {meta.totalItems} exams
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={!canGoPrev || isLoading}>
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {meta.page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={!canGoNext || isLoading}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </PageShell>
    </div>
  )
}
