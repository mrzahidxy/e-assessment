"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatePanel } from "@/components/ui/state-panel";
import { PageShell } from "@/components/ui/page-shell";
import ReviewAnswers from "@/components/review-answers";
import { useSubmissionDetail } from "@/hooks/queries/useSubmissionDetail";
import { useGradeSubmission } from "@/hooks/queries/useGradeSubmission";
import { useToast } from "@/hooks/use-toast";

export default function AdminSubmissionPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const gradeSubmission = useGradeSubmission();
  const {
    data: submission,
    isLoading,
    isError,
    refetch,
  } = useSubmissionDetail(submissionId);
  const [grades, setGrades] = useState<Record<string, number | null>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const paperTitle = submission?.paper?.title ?? "Submission details";
  const statusLabel =
    submission?.status === "REVIEWED" ? "Reviewed" : "Pending review";
  const statusVariant = submission?.status === "REVIEWED" ? "success" : "warning";
  const submittedAt = submission?.submittedAt ?? submission?.createdAt ?? null;
  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) return value;
    return parsed.toLocaleDateString();
  };

  const handleSubmitGrades = async () => {
    if (!submission || gradeSubmission.isPending) return;
    const gradeEntries = Object.entries(grades);
    const commentEntries = Object.entries(comments);
    if (Object.keys(grades).length === 0 && commentEntries.length === 0) {
      toast({
        title: "No feedback to submit",
        description: "Please enter marks or comments before submitting.",
        variant: "destructive",
      });
      return;
    }
    const existingMarks = new Map<string, number>();
    submission.paper?.questions?.forEach((question) => {
      question.subQuestions?.forEach((subQuestion) => {
        const assigned = subQuestion.answer?.marks?.assigned;
        if (typeof assigned === "number") {
          existingMarks.set(subQuestion.id, assigned);
        }
      });
    });

    const gradeValues = new Map(gradeEntries);
    const commentValues = new Map(commentEntries);
    const subQuestions = (submission.paper?.questions ?? []).flatMap(
      (question) => question.subQuestions ?? []
    );
    const missingGrades = subQuestions.filter(
      (subQuestion) =>
        !gradeValues.has(subQuestion.id) && !existingMarks.has(subQuestion.id)
    );

    if (subQuestions.length === 0 || missingGrades.length > 0) {
      toast({
        title: "Grading is incomplete",
        description:
          subQuestions.length === 0
            ? "This paper has no sub-questions to grade."
            : `Assign marks to all sub-questions before submitting. ${missingGrades.length} remain ungraded.`,
        variant: "destructive",
      });
      return;
    }

    const payload = subQuestions.map((subQuestion) => {
      const comment = commentValues.get(subQuestion.id)?.trim();
      return {
        subQuestionId: subQuestion.id,
        assignedMarks: gradeValues.has(subQuestion.id)
          ? gradeValues.get(subQuestion.id)!
          : existingMarks.get(subQuestion.id)!,
        ...(comment ? { comment } : {}),
      };
    });

    try {
      await gradeSubmission.mutateAsync({
        submissionId,
        grades: payload,
        paperId: id,
      });
      toast({
        title: gradeEntries.some(([, grade]) => grade === null)
          ? "Grades updated"
          : "Grades saved",
        description: gradeEntries.some(([, grade]) => grade === null)
          ? "The cleared marks are ungraded. Add marks to every question before marking this submission reviewed."
          : "Submission has been marked as reviewed.",
        variant: "success",
      });
      router.push(`/admin/questions/${id}`);
    } catch (error) {
      // Error handling is done in the mutation's onError via toast
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Question Paper" />

      <PageShell className="space-y-4">
        <Card className="p-3 shadow-none border-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Link href={`/admin/questions/${id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8 px-2 shadow-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to submissions
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">
                  {paperTitle}
                </h1>
                {submission && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{submission.student?.name ?? "Student"}</span>
                    <span
                      className="h-1 w-1 rounded-full bg-muted-foreground/60"
                      aria-hidden
                    />
                    <span>{submission.student?.schoolCode ?? "—"}</span>
                    <span
                      className="h-1 w-1 rounded-full bg-muted-foreground/60"
                      aria-hidden
                    />
                    <span>Submitted {formatDate(submittedAt)}</span>
                  </div>
                )}
              </div>
            </div>
            {submission && (
              <Badge variant={statusVariant} className="text-[11px]">
                {statusLabel}
              </Badge>
            )}
          </div>
        </Card>

        {isLoading ? (
          <StatePanel kind="loading" title="Loading submission details" compact />
        ) : isError ? (
          <StatePanel
            kind="error"
            title="Couldn’t load submission"
            description="The submission may no longer be available. Return to the list or try again."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Try again
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/questions/${id}`}>Back to submissions</Link>
                </Button>
              </div>
            }
            compact
          />
        ) : submission ? (
          <>
            <ReviewAnswers
              submission={submission}
              gradeValues={grades}
              commentValues={comments}
              onGradeChange={(subQuestionId, value) => {
                setGrades((prev) => ({
                  ...prev,
                  [subQuestionId]: value,
                }));
              }}
              onCommentChange={(subQuestionId, value) => {
                setComments((prev) => ({
                  ...prev,
                  [subQuestionId]: value,
                }));
              }}
              isSaving={gradeSubmission.isPending}
              hideFooter
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSubmitGrades}
                disabled={gradeSubmission.isPending}
                size="sm"
                className="h-9 px-3 shadow-none"
              >
                {gradeSubmission.isPending ? "Saving..." : "Submit Feedback"}
              </Button>
            </div>
          </>
        ) : (
          <StatePanel
            kind="empty"
            title="Submission not found"
            description="This submission may have been removed. Return to the list to choose another submission."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/questions/${id}`}>Back to submissions</Link>
              </Button>
            }
            compact
          />
        )}
      </PageShell>
    </div>
  );
}
