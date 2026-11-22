"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatePanel } from "@/components/ui/state-panel";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ArrowLeft, ChevronRight, UserRound } from "lucide-react";
import AccessRequests from "@/components/access-requests";
import { useSubmissions } from "@/hooks/queries/useSubmissions";

export default function AdminQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [activeTab, setActiveTab] = useState<"requests" | "grading">(
    "requests"
  );
  const { id } = use(params);
  const {
    data: submissions = [],
    isLoading: isLoadingSubmissions,
    isError: isSubmissionsError,
    refetch: refetchSubmissions,
  } = useSubmissions(id);

  const paperTitle = submissions[0]?.paper?.title ?? "Question Paper";
  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) return value;
    return parsed.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Question Paper" />

      <PageShell className="space-y-4">
        <Card className="p-3 shadow-none border-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Link href="/admin/questions">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8 px-2 shadow-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">
                  {paperTitle}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{submissions.length} submissions</span>
                  <span
                    className="h-1 w-1 rounded-full bg-muted-foreground/60"
                    aria-hidden
                  />
                  <span>
                    {activeTab === "grading"
                      ? "Grade submissions"
                      : "Access requests"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
              {[
                { id: "requests", label: "Access Requests" },
                { id: "grading", label: "Grade Submissions" },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-3 text-xs ${
                    activeTab === tab.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab(tab.id as "requests" | "grading")}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {activeTab === "requests" && <AccessRequests paperId={id} />}

        {activeTab === "grading" && (
          <Card className="shadow-none border-border gap-0 p-0">
            <div className="border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                Student Submissions ({submissions.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Select a student to grade their answers
              </p>
            </div>
            <div className="space-y-2 p-3">
              {isLoadingSubmissions && (
                <StatePanel kind="loading" title="Loading submissions" compact />
              )}
              {isSubmissionsError && (
                <StatePanel
                  kind="error"
                  title="Couldn’t load submissions"
                  description="Please try again."
                  action={
                    <Button variant="outline" size="sm" onClick={() => void refetchSubmissions()}>
                      Try again
                    </Button>
                  }
                  compact
                />
              )}
              {!isLoadingSubmissions &&
                !isSubmissionsError &&
                submissions.length === 0 && (
                  <StatePanel kind="empty" title="No submissions yet" compact />
                )}
              {!isSubmissionsError &&
                submissions.map((submission) => {
                  const statusLabel =
                    submission.status === "REVIEWED"
                      ? "Graded"
                      : "Pending review";
                  const statusVariant =
                    submission.status === "REVIEWED" ? "success" : "warning";
                  const submittedAt = formatDate(
                    submission.submittedAt ?? submission.createdAt
                  );

                  return (
                    <Link
                      key={submission.id}
                      href={`/admin/questions/${id}/submissions/${submission.id}`}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-xs transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <div className="h-9 w-9 rounded-full bg-muted/70 flex items-center justify-center text-muted-foreground">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {submission.student?.name ?? "Unknown Student"}
                          </p>
                          <Badge variant={statusVariant} className="text-[10px]">
                            {statusLabel}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>
                            School: {submission.student?.schoolCode ?? "—"}
                          </span>
                          <span
                            className="h-1 w-1 rounded-full bg-muted-foreground/60"
                            aria-hidden
                          />
                          <span>Submitted: {submittedAt}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
            </div>
          </Card>
        )}
      </PageShell>
    </div>
  );
}
