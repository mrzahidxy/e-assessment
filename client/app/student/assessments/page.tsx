"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StudentHeader } from "@/components/student-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatePanel } from "@/components/ui/state-panel";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAssessments } from "@/hooks/queries/useAssessments";
import { useAccessRequestMutations } from "@/hooks/queries/useAccessRequests";
import { useAuthStore } from "@/lib/auth-store";

const PAGE_SIZE = 10;

export default function StudentDashboard() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAssessments({
    page,
    limit: PAGE_SIZE,
  });
  const assessments = data?.data ?? [];
  const { create } = useAccessRequestMutations();

  // Ensure assessments is always an array
  const safeAssessments = Array.isArray(assessments) ? assessments : [];
  const meta = data?.meta ?? {
    page,
    limit: PAGE_SIZE,
    totalItems: safeAssessments.length,
    totalPages: Math.max(1, Math.ceil(safeAssessments.length / PAGE_SIZE)),
  };

  const totalPages = Math.max(1, meta.totalPages ?? 1);
  const canGoPrev = meta.page > 1;
  const canGoNext = meta.page < totalPages;

  const handlePrev = () => {
    if (canGoPrev) setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    if (canGoNext) setPage((prev) => prev + 1);
  };

  const startItem =
    meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const endItem =
    meta.totalItems === 0
      ? 0
      : Math.min(
          meta.totalItems,
          (meta.page - 1) * meta.limit + safeAssessments.length
        );
  const { user } = useAuthStore();

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const studentName = user.name;
  const schoolCode = user.schoolCode || "N/A";

  const getAssessmentState = (assessment: (typeof safeAssessments)[number]) => {
    const isExpired = new Date(assessment.endDate) < new Date();
    const hasStarted = new Date(assessment.startDate) <= new Date();

    if (assessment.attemptStatus === "IN_PROGRESS") {
      return "in-progress";
    }

    // If student has submitted
    if (assessment.hasSubmitted) {
      return "submitted";
    }

    // If assessment is expired/closed
    if (isExpired) {
      return "expired";
    }

    // Check access request status
    if (!assessment.accessStatus) {
      return "no-request"; // Can request access
    }

    if (assessment.accessStatus === "PENDING") {
      return "pending";
    }

    if (assessment.accessStatus === "REJECTED") {
      return "rejected";
    }

    if (assessment.accessStatus === "APPROVED") {
      // Check if exam has started
      if (!hasStarted) {
        return "approved-not-started"; // Approved but not yet started
      }
      return "approved"; // Can start assessment
    }

    // If assessment hasn't started yet
    if (!hasStarted) {
      return "not-started";
    }

    return "unknown";
  };

  const handleRequest = (assessment: (typeof safeAssessments)[number]) => {
    if (assessment.accessStatus && assessment.accessStatus !== "REJECTED") return;
    create.mutate({
      paperId: assessment.id,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader studentName={studentName} schoolCode={schoolCode} />

      <PageShell>
        <div className="flex justify-between items-center mb-6">
          <h1 className="page-title">My Assessments</h1>
        </div>
        {isLoading && (
          <StatePanel kind="loading" title="Loading assessments" className="mb-4" />
        )}
        {isError && (
          <StatePanel
            kind="error"
            title="Couldn’t load assessments"
            description="Please try again."
            action={
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Try again
              </Button>
            }
            className="mb-4"
          />
        )}
        {create.isError && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            We couldn&apos;t update your access request. Please try again.
          </p>
        )}
        {!isLoading && !isError && safeAssessments.length === 0 && (
          <StatePanel
            kind="empty"
            title="No assessments available yet"
            description="Check back later for assessments assigned to you."
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeAssessments.map((assessment) => {
            const duration = assessment.durationMinutes;
            const questionCount = assessment._count?.questions;
            const state = getAssessmentState(assessment);

            return (
              <Card
                key={assessment.id}
                className="p-6 flex flex-col hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <FileText className="w-5 h-5 text-primary mt-2" />

                  <div className="flex-1 grid gap-5">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">
                        {assessment.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {assessment.description || "Assessment"} • {duration}m
                        {questionCount !== undefined &&
                          ` • ${questionCount} ${questionCount === 1 ? "question" : "questions"}`}
                      </p>
                      <p className="text-sm text-foreground mt-2">
                        <span className="font-semibold text-primary">
                          Schedule:
                        </span>{" "}
                        <span className="font-medium">
                          {new Date(assessment.startDate).toLocaleString()} -{" "}
                          {new Date(assessment.endDate).toLocaleString()}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                      {/* Submitted state */}
                      {state === "submitted" && (
                        <>
                          <Badge variant="info" className="px-3 py-1.5">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Submitted
                          </Badge>
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              href={`/student/feedback/${assessment?.submissionId}`}
                            >
                              View Feedback
                            </Link>
                          </Button>
                        </>
                      )}

                      {/* Approved - can start */}
                      {(state === "approved" || state === "in-progress") && (
                        <>
                          <Badge variant={state === "approved" ? "success" : "warning"} className="px-3 py-1.5">
                            {state === "approved" ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                            {state === "approved" ? "Approved" : "In Progress"}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/student/assessments/${assessment.id}`)
                            }
                          >
                            {state === "approved" ? "Start" : "Resume"}
                          </Button>
                        </>
                      )}

                      {/* Approved but not started yet */}
                      {state === "approved-not-started" && (
                        <>
                          <Badge variant="success" className="px-3 py-1.5">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                          <Button size="sm" disabled>
                            Not Started Yet
                          </Button>
                        </>
                      )}

                      {/* Pending approval */}
                      {state === "pending" && (
                        <Badge variant="warning" className="px-3 py-1.5">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Approval
                        </Badge>
                      )}

                      {/* Rejected */}
                      {state === "rejected" && (
                        <>
                          <Badge variant="danger" className="px-3 py-1.5">
                            <XCircle className="w-3 h-3 mr-1" />
                            Request declined
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequest(assessment)}
                            disabled={create.isPending}
                          >
                            Request again
                          </Button>
                        </>
                      )}

                      {/* Can request access */}
                      {state === "no-request" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleRequest(assessment)}
                          disabled={create.isPending}
                        >
                          {create.isPending ? "Requesting..." : "Request Access"}
                        </Button>
                      )}

                      {/* Expired/Not started */}
                      {(state === "expired" || state === "not-started") && (
                        <Badge variant="muted" className="px-3 py-1.5">
                          {state === "expired" ? "Expired" : "Not Started"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {safeAssessments.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {startItem}-{endItem} of {meta.totalItems} assessments
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={!canGoPrev || isLoading}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {meta.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canGoNext || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}
