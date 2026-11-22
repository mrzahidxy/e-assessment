"use client";

import he from "he";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/state-panel";
import { GraphAnswerEditor } from "@/components/exam/graph-answer";
import { DrawingAnswerEditor } from "@/components/exam/drawing-answer";
import { ImageCompositionAnswerEditor } from "@/components/exam/image-composition-answer";
import { CircuitAnswerEditor } from "@/components/exam/circuit-answer";
import { TableAnswerEditor } from "@/components/exam/table-answer";
import { InteractiveTableReview } from "@/components/exam/interactive-table-renderer";
import type { SubmissionDetail } from "@/types";

type ReviewAnswersProps = {
  submission?: SubmissionDetail | null;
  gradeValues?: Record<string, number | null>;
  onGradeChange?: (subQuestionId: string, value: number | null) => void;
  commentValues?: Record<string, string>;
  onCommentChange?: (subQuestionId: string, value: string) => void;
  isSaving?: boolean;
  hideFooter?: boolean;
};

const decodeHtml = (value?: string | null) => (value ? he.decode(value) : "");
const stripHtml = (value?: string | null) =>
  value
    ? decodeHtml(value)
        .replace(/<[^>]*>/g, "")
        .trim()
    : "";

const getQuestionSummary = (
  label?: string | null,
  question?: string | null
) => {
  const questionText =
    stripHtml(question ?? "") || "No question text provided.";
  return label ? `${label}. ${questionText}` : questionText;
};

function sortByPosition<T extends { position?: number | null }>(
  items?: T[] | null
) {
  if (!items?.length) return [];
  return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export default function ReviewAnswers({
  submission,
  gradeValues = {},
  commentValues = {},
  onGradeChange,
  onCommentChange,
  isSaving = false,
  hideFooter = false,
}: ReviewAnswersProps) {
  if (!submission) {
    return (
      <StatePanel kind="empty" title="No submission selected" compact />
    );
  }

  const questions = sortByPosition(submission.paper?.questions);

  return (
    <div className="space-y-3">
      {questions.length === 0 ? (
        <StatePanel kind="empty" title="No questions in this submission" compact />
      ) : (
        questions.map((question, questionIndex) => (
          <Card key={question.id} className="p-3 space-y-2">
            <h4 className="text-sm font-semibold text-foreground leading-tight">
              Question {question.position ?? questionIndex + 1} (
              {question.marks ?? 0} marks)
            </h4>
            {question.contentHtml && (
              <div
                className="text-[13px] text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: decodeHtml(question.contentHtml),
                }}
              />
            )}
            <div className="space-y-2">
              {sortByPosition(question.subQuestions).map((subQuestion) => {
                const subQuestionId = subQuestion.id;
                const questionLabel = subQuestion.label ?? subQuestionId;
                const questionSummary = getQuestionSummary(
                  questionLabel,
                  subQuestion.question
                );
                const questionHtml =
                  decodeHtml(subQuestion.question ?? "") ||
                  "No question text provided.";
                const gradeKey = subQuestionId;
                const gradeFromInput = gradeValues[gradeKey];
                const commentFromInput = commentValues[gradeKey];
                const savedGrade = subQuestion.answer?.marks?.assigned;
                const grade = Object.hasOwn(gradeValues, gradeKey)
                  ? gradeFromInput ?? ""
                  : savedGrade ?? "";
                const comment =
                  commentFromInput ??
                  subQuestion.answer?.comment ??
                  subQuestion.answer?.marks?.comment ??
                  "";
                const maxScore =
                  subQuestion.marks ?? subQuestion.answer?.marks?.max ?? 0;
                const isGraph = subQuestion.questionType === "GRAPH";
                const isDrawing = subQuestion.questionType === "DRAWING";
                const isImageComposition = subQuestion.questionType === "IMAGE_COMPOSITION";
                const isInteractiveTable =
                  subQuestion.questionType === "INTERACTIVE_TABLE";
                const isCircuit = subQuestion.questionType === "CIRCUIT";
                const isTable = subQuestion.questionType === "TABLE";

                return (
                  <div
                    key={`${question.id}-${subQuestionId}`}
                    className="border border-border rounded p-2.5 space-y-2"
                  >
                    {questionLabel}.
                    <div
                      className="preview-content review-answers-content text-[13px] text-muted-foreground prose prose-sm max-w-none prose-ol:list-decimal prose-ul:list-disc prose-li:ml-4"
                      dangerouslySetInnerHTML={{ __html: questionHtml }}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Assigned: {grade === "" ? "Ungraded" : `${grade}/${maxScore}`}
                    </div>
                    <div className="preview-content review-answers-content text-sm bg-muted/40 rounded p-2 min-h-10 text-foreground leading-snug">
                      {isGraph ? (
                        <GraphAnswerEditor
                          value={subQuestion.answer?.answerText ?? ""}
                          readonly
                        />
                      ) : isDrawing ? (
                        <DrawingAnswerEditor
                          value={subQuestion.answer?.answerText ?? ""}
                          readonly
                        />
                      ) : isImageComposition ? (
                        <ImageCompositionAnswerEditor
                          value={subQuestion.answer?.answerText ?? ""}
                          readonly
                          template={subQuestion.imageCompositionTemplate ?? undefined}
                        />
                      ) : isCircuit ? (
                        <CircuitAnswerEditor
                          value={subQuestion.answer?.answerText ?? ""}
                          readonly
                          template={subQuestion.circuitTemplate ?? undefined}
                        />
                      ) : isInteractiveTable ? (
                        <InteractiveTableReview
                          value={subQuestion.answer?.answerText ?? ""}
                          template={subQuestion.template ?? undefined}
                        />
                      ) : isTable ? (
                        <TableAnswerEditor
                          value={subQuestion.answer?.answerText ?? ""}
                          readonly
                        />
                      ) : (
                        <div className="prose prose-sm max-w-none prose-ol:list-decimal prose-ul:list-disc prose-li:ml-4">
                          <div
                            dangerouslySetInnerHTML={{
                              __html:
                                decodeHtml(subQuestion.answer?.answerText ?? "") ||
                                "No answer submitted.",
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      Marks ({maxScore} max):
                      <input
                        type="number"
                        min="0"
                        max={maxScore || undefined}
                        value={grade}
                        onChange={(e) => {
                          const value = e.target.value === "" ? null : Number(e.target.value);
                          const targetKey = gradeKey;
                          if (targetKey && (value === null || !Number.isNaN(value))) {
                            onGradeChange?.(targetKey, value);
                          }
                        }}
                        disabled={!onGradeChange}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-border rounded text-xs"
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <span className="text-muted-foreground">
                        Comment (optional):
                      </span>
                      <textarea
                        value={comment}
                        onChange={(e) => {
                          const value = e.target.value;
                          const targetKey = gradeKey;
                          if (targetKey) {
                            onCommentChange?.(targetKey, value);
                          }
                        }}
                        disabled={!onCommentChange}
                        className="w-full px-2 py-1 border border-border rounded text-xs min-h-[64px] resize-y"
                        placeholder="Add a comment"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}

      {!hideFooter && (
        <div className="flex justify-end">
          <Button disabled>{isSaving ? "Saving..." : "Submit Feedback"}</Button>
        </div>
      )}
    </div>
  );
}
