"use client";

import { memo } from "react";
import he from "he";
import { RichTextEditor } from "../rich-text-editor";
import { GraphAnswerEditor } from "./graph-answer";
import { DrawingAnswerEditor } from "./drawing-answer";
import { ImageCompositionAnswerEditor } from "./image-composition-answer";
import { CircuitAnswerEditor } from "./circuit-answer";
import { TableAnswerEditor } from "./table-answer";
import { InteractiveTableStudentAnswer } from "./interactive-table-renderer";
import type { CircuitTemplate } from "@/lib/circuit-template";
import type { ImageCompositionTemplate } from "@/lib/image-composition-template";
import type { InteractiveTableTemplate } from "@/lib/interactive-table";

interface SubQuestionCardProps {
  questionPosition: number;
  label: string;
  prompt: string;
  marks: number;
  questionType?: string;
  mcqOptions?: {
    options: Array<{
      label: string;
      value: string;
    }>;
  } | null;
  circuitTemplate?: CircuitTemplate | null;
  imageCompositionTemplate?: ImageCompositionTemplate | null;
  template?: InteractiveTableTemplate | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  subQuestionId: string;
  readonly?: boolean;
}

function HtmlContent({ html }: { html: string }) {
  const decodeHtml = (html?: string | null) => (html ? he.decode(html) : "");

  return (
    <div
      className="prose prose-sm max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: decodeHtml(html) }}
    />
  );
}

export const SubQuestionCard = memo(function SubQuestionCard({
  questionPosition,
  label,
  prompt,
  marks,
  questionType,
  mcqOptions,
  circuitTemplate,
  imageCompositionTemplate,
  template,
  answer,
  onAnswerChange,
  subQuestionId,
  readonly = false,
}: SubQuestionCardProps) {
  const isMCQ = questionType === "MCQ" && mcqOptions;
  const isGraph = questionType === "GRAPH";
  const isDrawing = questionType === "DRAWING";
  const isImageComposition = questionType === "IMAGE_COMPOSITION";
  const isInteractiveTable = questionType === "INTERACTIVE_TABLE";
  const isTable = questionType === "TABLE";
  const isCircuit = questionType === "CIRCUIT";

  return (
    <div
      className="flex h-full flex-col rounded border border-border bg-card"
      id={`subq-${subQuestionId}`}
    >
      {/* Header */}
      <div className="border-b border-border bg-muted/40 px-4 py-2">
        <h3 className="text-sm font-semibold text-foreground">
          Question {questionPosition}
          {label} ({marks} mark{marks !== 1 ? "s" : ""})
        </h3>
      </div>

      {/* Prompt */}
      <div className="border-b border-border px-4 py-3">
        <HtmlContent html={prompt} />
      </div>

      {/* Answer area */}
      <div className="px-4 py-3 flex-1">
        {readonly && (
          <div className="mb-3 p-2 bg-warning/15 border border-warning/30 rounded text-sm text-warning-foreground">
            Reading time - answers are disabled
          </div>
        )}
        {isMCQ ? (
          <div className="space-y-2">
            {mcqOptions.options.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 rounded border border-border p-3 ${
                  readonly
                    ? "bg-muted/50 cursor-not-allowed"
                    : "hover:bg-muted/40 cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name={`mcq-${subQuestionId}`}
                  value={option.value}
                  checked={answer === option.value}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  className="h-4 w-4 accent-primary"
                  disabled={readonly}
                />
                <span className="text-sm text-foreground">
                  <span className="font-medium">{option.label}</span>
                </span>
              </label>
            ))}
          </div>
        ) : isGraph ? (
          <GraphAnswerEditor
            value={answer}
            onChange={onAnswerChange}
            readonly={readonly}
          />
        ) : isDrawing ? (
          <DrawingAnswerEditor
            value={answer}
            onChange={onAnswerChange}
            readonly={readonly}
          />
        ) : isImageComposition ? (
          <ImageCompositionAnswerEditor
            value={answer}
            onChange={onAnswerChange}
            readonly={readonly}
            template={imageCompositionTemplate}
          />
        ) : isCircuit ? (
          <CircuitAnswerEditor
            value={answer}
            onChange={onAnswerChange}
            readonly={readonly}
            template={circuitTemplate}
          />
        ) : isInteractiveTable ? (
          <InteractiveTableStudentAnswer
            value={answer}
            onChange={onAnswerChange}
            readonly={readonly}
            template={template}
          />
        ) : isTable ? (
          <TableAnswerEditor
            value={answer}
            onChange={onAnswerChange}
            readonly={readonly}
          />
        ) : (
          <div className={readonly ? "pointer-events-none opacity-60" : ""}>
            <div className="mb-2">
              <RichTextEditor
                value={answer}
                onChange={onAnswerChange}
                placeholder="Type your answer here..."
                isStudentView={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
