"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { Badge } from "@/components/ui/badge";
import { useSubmissions } from "@/hooks/queries/useSubmissions";
import { StudentHeader } from "@/components/student-header";

const formatDate = (value: string | null) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

export default function StudentFeedbackPage() {
  const reviewedQuery = useSubmissions(undefined, "REVIEWED", true);
  const submittedQuery = useSubmissions(undefined, "SUBMITTED", true);
  const isLoading = reviewedQuery.isLoading || submittedQuery.isLoading;
  const isError = reviewedQuery.isError || submittedQuery.isError;
  const feedbackItems = [
    ...(reviewedQuery.data ?? []),
    ...(submittedQuery.data ?? []),
  ].sort(
    (left, right) =>
      new Date(right.submittedAt ?? right.createdAt).getTime() -
      new Date(left.submittedAt ?? left.createdAt).getTime()
  );

  const retry = () => {
    void reviewedQuery.refetch();
    void submittedQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <PageShell width="narrow" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Assessment feedback</h1>
            <p className="text-sm text-muted-foreground">
              Review marks and comments, or check submissions still awaiting review.
            </p>
          </div>
        </div>

        {isLoading && (
          <StatePanel kind="loading" title="Loading your submissions" />
        )}
        {isError && (
          <StatePanel
            kind="error"
            title="Couldn’t load feedback"
            description="Please try again."
            action={
              <Button variant="outline" size="sm" onClick={retry}>
                Try again
              </Button>
            }
          />
        )}
        {!isLoading && !isError && feedbackItems.length === 0 && (
          <StatePanel
            kind="empty"
            title="No submitted assessments yet"
            description="Once you submit an assessment, its review status and feedback will appear here."
          />
        )}
        {!isLoading && !isError && feedbackItems.length > 0 && (
          <div className="space-y-3">
            {feedbackItems.map((submission) => {
              const isReviewed = submission.status === "REVIEWED";
              return (
                <Card
                  key={submission.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"
                >
                  <div className="min-w-0 space-y-2">
                    <h2 className="truncate font-semibold text-foreground">
                      {submission.paper.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant={isReviewed ? "success" : "warning"}>
                        {isReviewed ? "Reviewed" : "Awaiting review"}
                      </Badge>
                      <span>Submitted {formatDate(submission.submittedAt)}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/student/feedback/${submission.id}`}>
                      {isReviewed ? "View feedback" : "View submission"}
                    </Link>
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </PageShell>
    </div>
  );
}
