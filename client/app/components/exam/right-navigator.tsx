"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "./status-icon";
import { useState, memo } from "react";

interface SubQuestionNavItem {
  id: string;
  label: string;
  answered: boolean;
}

interface QuestionNavGroup {
  id: string;
  position: number;
  marks: number;
  subQuestions: SubQuestionNavItem[];
}

interface RightNavigatorProps {
  questions: QuestionNavGroup[];
  selectedQuestionId: string;
  onSelectQuestion: (questionId: string) => void;
  onSelectSubQuestion: (subQuestionId: string) => void;
  onPrevQuestion: () => void;
  onNextQuestion: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export const RightNavigator = memo(function RightNavigator({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onSelectSubQuestion,
  onPrevQuestion,
  onNextQuestion,
  canGoPrev,
  canGoNext,
}: RightNavigatorProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set(questions.map((q) => q.id))
  );

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  return (
    <div className="flex h-40 w-full flex-col border-t border-border bg-muted/30 sm:h-auto sm:w-48 sm:border-l sm:border-t-0">
      {/* Prev button */}
      <div className="border-b border-border p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onPrevQuestion}
          disabled={!canGoPrev}
        >
          ← Previous Q
        </Button>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto">
        {questions.map((question) => {
          const isExpanded = expandedQuestions.has(question.id);
          const isSelected = selectedQuestionId === question.id;
          const answeredCount = question.subQuestions.filter(
            (sq) => sq.answered
          ).length;
          const totalCount = question.subQuestions.length;
          const percentage =
            totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

          return (
            <div key={question.id} className="border-b border-border">
              {/* Question header */}
              <div className="flex items-center border-b border-border">
                <button
                  onClick={() => {
                    onSelectQuestion(question.id);
                    if (!isExpanded) {
                      toggleQuestion(question.id);
                    }
                  }}
                  aria-current={isSelected ? "step" : undefined}
                  aria-label={`Question ${question.position}, ${answeredCount} of ${totalCount} subquestions answered`}
                  className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                    isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                  }`}
                >
                  <StatusIcon percentage={percentage} />
                  <span className="text-sm font-semibold text-foreground">
                    {question.position} ({question.marks})
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {answeredCount}/{totalCount}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} question ${question.position}`}
                  aria-expanded={isExpanded}
                  onClick={() => toggleQuestion(question.id)}
                  className="rounded-sm p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Subquestions */}
              {isExpanded && (
                <div className="bg-card">
                  {question.subQuestions.map((subQ) => (
                    <button
                      key={subQ.id}
                      onClick={() => onSelectSubQuestion(subQ.id)}
                      aria-label={`Question ${question.position}${subQ.label}, ${subQ.answered ? "answered" : "not answered"}`}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      {subQ.answered ? (
                        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Circle aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs text-foreground">
                        Question {question.position}
                        {subQ.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next button */}
      <div className="border-t border-border p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onNextQuestion}
          disabled={!canGoNext}
        >
          Next Q →
        </Button>
      </div>
    </div>
  );
});
