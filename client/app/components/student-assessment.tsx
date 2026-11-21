"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { KeyRound, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatePanel } from "@/components/ui/state-panel";
import { useSubmissionMutations } from "@/hooks/mutations/useSubmissionMutations";
import { usePaper } from "@/hooks/queries/usePaper";
import { useAuthStore } from "@/lib/auth-store";
import { backendApiFetch } from "@/lib/api-client";
import { drawingAnswerHasContent } from "@/lib/drawing-answer";
import { getInteractiveTableAnswerHasValue } from "@/lib/interactive-table";
import { TopAppBar } from "./exam/top-app-bar";
import { QuestionCard } from "./exam/question-card";
import { RightNavigator } from "./exam/right-navigator";
import { CalculatorPopup } from "./calculator/CalculatorPopup";

type StudentAssessmentProps = {
  assessmentId: string;
};

type ExamAttempt = {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "REVIEWED";
  startedAt: string;
  deadlineAt: string;
  answers: { subQuestionId: string; answerText: string }[];
};

type DraftSaveState = "saved" | "saving" | "error";

type SecurityViolationType =
  | "COPY_SHORTCUT"
  | "PASTE_SHORTCUT"
  | "CUT_SHORTCUT"
  | "ALT_TAB"
  | "WINDOW_SWITCH"
  | "FULLSCREEN_EXIT"
  | "DEVTOOLS"
  | "KEYBOARD_SHORTCUT";

const SECURITY_VIOLATION_LABELS: Record<SecurityViolationType, string> = {
  COPY_SHORTCUT: "Copy shortcut detected",
  PASTE_SHORTCUT: "Paste shortcut detected",
  CUT_SHORTCUT: "Cut shortcut detected",
  ALT_TAB: "Alt+Tab detected",
  WINDOW_SWITCH: "Window switch detected",
  FULLSCREEN_EXIT: "Fullscreen exit detected",
  DEVTOOLS: "Developer tools detected",
  KEYBOARD_SHORTCUT: "Blocked keyboard shortcut detected",
};

const POST_UNLOCK_GRACE_MS = 2500;
const PENALTY_COOLDOWN_MS = 3000;
const PROGRESSIVE_PENALTY_STEP_MINUTES = 10;
// Helper to strip HTML tags for answer validation
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
}

function getSecurityViolationMessage(
  violationType: SecurityViolationType,
  details?: string
) {
  if (!details) {
    return SECURITY_VIOLATION_LABELS[violationType];
  }

  return `${SECURITY_VIOLATION_LABELS[violationType]}: ${details}`;
}

function shouldRespectPostUnlockGrace(violationType: SecurityViolationType) {
  return (
    violationType === "FULLSCREEN_EXIT" ||
    violationType === "WINDOW_SWITCH" ||
    violationType === "DEVTOOLS"
  );
}

function shouldApplyProgressivePenalty(violationType: SecurityViolationType) {
  return (
    violationType === "FULLSCREEN_EXIT" ||
    violationType === "WINDOW_SWITCH" ||
    violationType === "ALT_TAB"
  );
}

function shouldIgnoreDuringUnlockTransition(
  violationType: SecurityViolationType
) {
  return (
    violationType === "FULLSCREEN_EXIT" ||
    violationType === "WINDOW_SWITCH" ||
    violationType === "DEVTOOLS"
  );
}

function getProgressivePenaltySeconds(violationCount: number) {
  return violationCount * PROGRESSIVE_PENALTY_STEP_MINUTES * 60;
}

export default function StudentAssessment({
  assessmentId,
}: StudentAssessmentProps) {
  // All hooks must be called at the top level before any conditional returns
  const { data: paper, isLoading, isError, error, refetch } = usePaper(assessmentId);
  const { user } = useAuthStore();

  // Normalized state: answers keyed by subQuestionId (stable UUID)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptDeadlineAt, setAttemptDeadlineAt] = useState<number | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("saved");
  const [isStarting, setIsStarting] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [penaltySeconds, setPenaltySeconds] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [isExamLocked, setIsExamLocked] = useState(false);
  const [lockReason, setLockReason] = useState<SecurityViolationType | null>(
    null
  );
  const [adminUnlockCode, setAdminUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const { create } = useSubmissionMutations();
  const submissionInFlightRef = useRef(false);
  const lastUnlockAtRef = useRef<number>(0);
  const isUnlockTransitionRef = useRef(false);
  const isExamLockedRef = useRef(false);
  const lastPenaltyAtRef = useRef<number>(0);
  const progressivePenaltyCountRef = useRef(0);
  const focusLossTimerRef = useRef<number | null>(null);
  const draftQueueRef = useRef<Promise<void>>(Promise.resolve());

  const lockExam = useCallback(
    (violationType: SecurityViolationType, details?: string) => {
      if (submitted || isExamLockedRef.current) {
        return;
      }

      if (
        isUnlockTransitionRef.current &&
        shouldIgnoreDuringUnlockTransition(violationType)
      ) {
        return;
      }

      if (
        shouldRespectPostUnlockGrace(violationType) &&
        Date.now() - lastUnlockAtRef.current < POST_UNLOCK_GRACE_MS
      ) {
        return;
      }

      if (shouldApplyProgressivePenalty(violationType)) {
        const now = Date.now();

        if (now - lastPenaltyAtRef.current >= PENALTY_COOLDOWN_MS) {
          lastPenaltyAtRef.current = now;
          progressivePenaltyCountRef.current += 1;
          const penaltySeconds = getProgressivePenaltySeconds(
            progressivePenaltyCountRef.current
          );

          setPenaltySeconds((prev) => prev + penaltySeconds);
        }
      }

      isExamLockedRef.current = true;
      setLockReason(violationType);
      setUnlockError(null);
      setIsExamLocked(true);

      void backendApiFetch<{ logged: boolean }>("/security/incidents", {
        method: "POST",
        body: JSON.stringify({
          paperId: assessmentId,
          violationType,
          details,
        }),
      })
        .then((result) => {
          if (!result.success) {
            console.warn("Could not log exam security incident:", result.error);
          }
        })
        .catch((error) => {
          console.warn("Could not log exam security incident:", error);
        });
    },
    [assessmentId, submitted]
  );

  const enterFullscreen = useCallback(async () => {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  }, []);

  const handleUnlockWithAdminCode = useCallback(async () => {
    if (!adminUnlockCode.trim()) {
      setUnlockError("Enter the admin unlock code.");
      return;
    }

    setIsUnlocking(true);
    setUnlockError(null);
    isUnlockTransitionRef.current = true;

    try {
      // Request fullscreen before awaiting verification to preserve user activation.
      if (!document.fullscreenElement) {
        try {
          await enterFullscreen();
        } catch (err) {
          console.error("Error re-entering fullscreen before unlock:", err);
          setUnlockError("Fullscreen could not be restored. Allow fullscreen, then try again.");
          return;
        }
      }

      if (!document.fullscreenElement) {
        setUnlockError("Return to fullscreen before continuing the assessment.");
        return;
      }

      const result = await backendApiFetch<{ unlocked: boolean }>(
        "/security/exam-unlock",
        {
          method: "POST",
          body: JSON.stringify({
            paperId: assessmentId,
            code: adminUnlockCode,
          }),
        }
      );

      if (!result.success) {
        setUnlockError(result.error || "Invalid admin unlock code.");
        return;
      }

      lastUnlockAtRef.current = Date.now();
      isExamLockedRef.current = false;
      setIsExamLocked(false);
      setLockReason(null);
      setAdminUnlockCode("");
    } finally {
      setIsUnlocking(false);
      window.setTimeout(() => {
        isUnlockTransitionRef.current = false;
      }, 500);
    }
  }, [adminUnlockCode, assessmentId, enterFullscreen]);

  useEffect(() => {
    const clock = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  const startsAt = paper ? new Date(paper.startDate).getTime() : 0;
  const endsAt = paper ? new Date(paper.endDate).getTime() : 0;
  const submissionOpensAt =
    startsAt + (paper?.earlySubmissionRestrictionMinutes ?? 0) * 60 * 1000;
  const isWithinExamWindow =
    !!paper && currentTime >= startsAt && currentTime <= endsAt;
  const canStartExam = !!paper && currentTime >= startsAt;
  const effectiveDeadlineAt = attemptDeadlineAt ?? endsAt;
  const timeRemaining = paper
    ? Math.max(0, Math.ceil((effectiveDeadlineAt - currentTime) / 1000) - penaltySeconds)
    : 0;

  // Keep submission controls on the same schedule enforced by the API.
  const canSubmitEarly = useMemo(() => {
    return isWithinExamWindow && currentTime >= submissionOpensAt;
  }, [currentTime, isWithinExamWindow, submissionOpensAt]);

  // Calculate early submission disabled message
  const earlySubmitDisabledMessage = useMemo(() => {
    if (canSubmitEarly) {
      return undefined;
    }
    if (!paper) return undefined;
    if (currentTime < startsAt) return "The exam has not started yet.";
    if (currentTime > endsAt) return "The exam submission window has closed.";
    if (currentTime < submissionOpensAt) {
      const remainingMinutes = Math.ceil((submissionOpensAt - currentTime) / 60000);
      return `You can submit in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`;
    }
    return undefined;
  }, [canSubmitEarly, currentTime, endsAt, paper, startsAt, submissionOpensAt]);

  // Initialize selected question when paper loads
  useEffect(() => {
    if (paper) {
      if (
        !selectedQuestionId &&
        paper.questions &&
        paper.questions.length > 0
      ) {
        setSelectedQuestionId(paper.questions[0].id);
      }
    }
  }, [paper, selectedQuestionId]);

  // Security: Detect and block copy/paste shortcuts
  useEffect(() => {
    const preventCopyPaste = (e: ClipboardEvent) => {
      if (!hasStartedExam || submitted) {
        return;
      }

      const type =
        e.type === "copy"
          ? "COPY_SHORTCUT"
          : e.type === "paste"
          ? "PASTE_SHORTCUT"
          : "CUT_SHORTCUT";

      e.preventDefault();
      lockExam(type, "Clipboard action blocked");
      return false;
    };

    document.addEventListener("copy", preventCopyPaste);
    document.addEventListener("paste", preventCopyPaste);
    document.addEventListener("cut", preventCopyPaste);

    return () => {
      document.removeEventListener("copy", preventCopyPaste);
      document.removeEventListener("paste", preventCopyPaste);
      document.removeEventListener("cut", preventCopyPaste);
    };
  }, [hasStartedExam, submitted, lockExam]);

  // Security: Disable right-click
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", preventContextMenu);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, []);

  // Security: Detect blocked keyboard shortcuts and focus loss
  useEffect(() => {
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if (!hasStartedExam || submitted) {
        return;
      }

      const key = e.key.toLowerCase();

      // Disable F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
        lockExam("KEYBOARD_SHORTCUT", "F12");
        return false;
      }

      // Disable Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        lockExam("DEVTOOLS", "Ctrl+Shift+I");
        return false;
      }

      // Disable Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        lockExam("DEVTOOLS", "Ctrl+Shift+J");
        return false;
      }

      // Disable Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        lockExam("DEVTOOLS", "Ctrl+Shift+C");
        return false;
      }

      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && key === "u") {
        e.preventDefault();
        lockExam("KEYBOARD_SHORTCUT", "Ctrl+U");
        return false;
      }

      // Disable copy, paste, cut, and tab switching shortcuts
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(key)) {
        e.preventDefault();
        lockExam(
          key === "c"
            ? "COPY_SHORTCUT"
            : key === "v"
            ? "PASTE_SHORTCUT"
            : "CUT_SHORTCUT",
          `${e.ctrlKey ? "Ctrl" : "Cmd"}+${key.toUpperCase()}`
        );
        return false;
      }

      if ((e.altKey && key === "tab") || (e.metaKey && key === "tab")) {
        e.preventDefault();
        lockExam("ALT_TAB", `${e.altKey ? "Alt" : "Cmd"}+Tab`);
        return false;
      }

      if (e.altKey && key === "f4") {
        e.preventDefault();
        lockExam("KEYBOARD_SHORTCUT", "Alt+F4");
        return false;
      }

      if (e.metaKey) {
        e.preventDefault();
        lockExam("KEYBOARD_SHORTCUT", `Meta+${e.key}`);
        return false;
      }
    };

    document.addEventListener("keydown", preventKeyboardShortcuts);

    return () => {
      document.removeEventListener("keydown", preventKeyboardShortcuts);
    };
  }, [hasStartedExam, submitted, lockExam]);

  // Security: Detect DevTools (before and during exam)
  useEffect(() => {
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold =
        window.outerHeight - window.innerHeight > threshold;

      const devToolsDetected = widthThreshold || heightThreshold;

      if (devToolsDetected) {
        setIsDevToolsOpen(true);
        if (hasStartedExam) {
          lockExam("DEVTOOLS", "DevTools dimension threshold exceeded");
        }
      } else {
        setIsDevToolsOpen(false);
      }
    };

    // Check immediately
    detectDevTools();

    const interval = setInterval(detectDevTools, 500);

    return () => clearInterval(interval);
  }, [hasStartedExam, lockExam]);

  // Security: Monitor fullscreen and lock exam if exited
  useEffect(() => {
    if (!hasStartedExam) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && hasStartedExam && !submitted) {
        lockExam("FULLSCREEN_EXIT", "Fullscreen mode exited");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Exit fullscreen when component unmounts (exam ends)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error("Error exiting fullscreen:", err);
        });
      }
    };
  }, [hasStartedExam, submitted, lockExam]);

  // Security: Detect focus loss and window switching without treating brief
  // browser/editor focus transitions as a window switch.
  useEffect(() => {
    if (!hasStartedExam) return;

    const handleBlur = () => {
      if (submitted || focusLossTimerRef.current !== null) return;

      focusLossTimerRef.current = window.setTimeout(() => {
        focusLossTimerRef.current = null;
        if (
          !submitted &&
          document.visibilityState === "visible" &&
          !document.hasFocus()
        ) {
          lockExam("WINDOW_SWITCH", "Window lost focus");
        }
      }, 500);
    };

    const clearPendingFocusLoss = () => {
      if (focusLossTimerRef.current !== null) {
        window.clearTimeout(focusLossTimerRef.current);
        focusLossTimerRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !submitted) {
        clearPendingFocusLoss();
        lockExam("WINDOW_SWITCH", "Tab or window hidden");
      } else if (document.hasFocus()) {
        clearPendingFocusLoss();
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", clearPendingFocusLoss);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", clearPendingFocusLoss);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearPendingFocusLoss();
    };
  }, [hasStartedExam, submitted, lockExam]);

  // Security: Prevent browser back button navigation
  useEffect(() => {
    if (!hasStartedExam) return;

    // Push a dummy state to prevent back navigation
    window.history.pushState(null, "", window.location.href);

    const preventBackNavigation = (e: PopStateEvent) => {
      // Push state again to keep user on exam page
      window.history.pushState(null, "", window.location.href);

      // Optionally show a warning
      if (!submitted) {
        alert(
          "You cannot navigate back during the exam. Please complete and submit your assessment."
        );
      }
    };

    window.addEventListener("popstate", preventBackNavigation);

    return () => {
      window.removeEventListener("popstate", preventBackNavigation);
    };
  }, [hasStartedExam, submitted]);

  const queueDraftSave = useCallback((snapshot: Record<string, string>) => {
    if (!attemptId) return Promise.resolve();
    const save = draftQueueRef.current.catch(() => undefined).then(async () => {
      const answersToSave = Object.entries(snapshot).map(([subQuestionId, answerText]) => ({
        subQuestionId,
        answerText,
      }));
      const result = await backendApiFetch<ExamAttempt>(`/submissions/${attemptId}/draft`, {
        method: "PUT",
        body: JSON.stringify({ answers: answersToSave }),
      });
      if (!result.success) throw new Error(result.error || "Draft save failed");
      if (!result.data) throw new Error("Draft save failed");
      if (result.data.status !== "IN_PROGRESS") {
        setSubmitted(true);
        setDraftSaveState("saved");
        return;
      }
      setDraftSaveState("saved");
    });
    draftQueueRef.current = save;
    return save;
  }, [attemptId]);

  useEffect(() => {
    if (!hasStartedExam || !attemptId || submitted) return;
    const save = () => {
      setDraftSaveState("saving");
      void queueDraftSave(answersRef.current).catch((error) => {
        console.warn("Could not save exam draft:", error);
        setDraftSaveState("error");
      });
    };
    const debounce = window.setTimeout(save, 600);
    return () => window.clearTimeout(debounce);
  }, [answers, attemptId, hasStartedExam, queueDraftSave, submitted]);

  useEffect(() => {
    if (!hasStartedExam || !attemptId || submitted) return;
    const retryInterval = window.setInterval(() => {
      setDraftSaveState("saving");
      void queueDraftSave(answersRef.current).catch((error) => {
        console.warn("Could not save exam draft:", error);
        setDraftSaveState("error");
      });
    }, 5_000);
    return () => window.clearInterval(retryInterval);
  }, [attemptId, hasStartedExam, queueDraftSave, submitted]);

  // Update answer by subQuestionId (stable key)
  const handleAnswerChange = useCallback(
    (subQuestionId: string, value: string) => {
      const next = { ...answersRef.current, [subQuestionId]: value };
      answersRef.current = next;
      setAnswers(next);
    },
    []
  );

  const handleQuit = async () => {
    try {
      await queueDraftSave(answersRef.current);
    } catch {
      setDraftSaveState("error");
      setSubmissionError("Your latest answers could not be saved. Please check your connection and try again before leaving.");
      return;
    }
    window.location.href = "/student/assessments";
  };

  const subQuestionById = useMemo(() => {
    const items = new Map<string, any>();
    paper?.questions?.forEach((question) => {
      question.subQuestions.forEach((subQuestion) => {
        items.set(subQuestion.id, subQuestion);
      });
    });
    return items;
  }, [paper]);

  const isAnswerFilled = useCallback(
    (subQuestionId: string, answer: string) => {
      const subQuestion = subQuestionById.get(subQuestionId);
      if (subQuestion?.questionType === "INTERACTIVE_TABLE") {
        return getInteractiveTableAnswerHasValue(answer, subQuestion.template);
      }
      if (subQuestion?.questionType === "DRAWING") {
        return drawingAnswerHasContent(answer);
      }
      return stripHtml(answer).trim() !== "";
    },
    [subQuestionById]
  );

  const submitAssessment = useCallback(async (isDeadlineSubmission: boolean) => {
    if (submissionInFlightRef.current || submitted || !hasStartedExam) return;
    if (!canSubmitEarly && !isDeadlineSubmission) {
      setSubmissionError(earlySubmitDisabledMessage ?? "Submission is not available yet.");
      return;
    }

    submissionInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      if (!attemptId) throw new Error("The exam attempt is not ready. Please try again.");
      await draftQueueRef.current.catch(() => undefined);
      const currentAnswers = answersRef.current;
      const submissionAnswers = Object.entries(currentAnswers)
        .filter(([subQuestionId, answer]) => isAnswerFilled(subQuestionId, answer))
        .map(([subQuestionId, answerText]) => ({ subQuestionId, answerText }));
      await create.mutateAsync({ submissionId: attemptId, answers: submissionAnswers });
      setIsSubmitting(false);
      setSubmitted(true);
    } catch (error) {
      console.error("Submission error:", error);
      setIsSubmitting(false);
      submissionInFlightRef.current = false;
      setSubmissionError(error instanceof Error ? error.message : "Failed to submit assessment. Please try again.");
    }
  }, [
    attemptId,
    canSubmitEarly,
    create,
    earlySubmitDisabledMessage,
    hasStartedExam,
    isAnswerFilled,
    submitted,
  ]);

  const handleSubmit = useCallback(() => {
    submitAssessment(false);
  }, [submitAssessment]);

  useEffect(() => {
    if (
      hasStartedExam &&
      !submitted &&
      timeRemaining <= 0
    ) {
      submitAssessment(true);
    }
  }, [currentTime, hasStartedExam, submitted, submitAssessment, timeRemaining]);

  // Track answered status separately to avoid recomputing navigation on every keystroke
  const [answeredStatus, setAnsweredStatus] = useState<Record<string, boolean>>(
    {}
  );

  // Update answered status only when answer transitions between empty and non-empty
  useEffect(() => {
    const newAnsweredStatus: Record<string, boolean> = {};
    let hasChanged = false;

    Object.entries(answers).forEach(([id, answer]) => {
      const isAnswered = isAnswerFilled(id, answer);
      newAnsweredStatus[id] = isAnswered;

      if (answeredStatus[id] !== isAnswered) {
        hasChanged = true;
      }
    });

    if (hasChanged) {
      setAnsweredStatus(newAnsweredStatus);
    }
  }, [answers, isAnswerFilled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build navigation data - only recalculates when answeredStatus changes
  const navigationData = useMemo(() => {
    if (!paper?.questions) return [];

    return paper.questions.map((q) => ({
      id: q.id,
      position: q.position,
      marks: q.marks,
      subQuestions: q.subQuestions.map((sq) => ({
        id: sq.id,
        label: sq.label,
        answered: answeredStatus[sq.id] || false,
      })),
    }));
  }, [paper?.questions, answeredStatus]);

  // Count answered questions for completion display
  const totalAnswers = useMemo(() => {
    return Object.entries(answers).filter(([subQuestionId, answer]) =>
      isAnswerFilled(subQuestionId, answer)
    ).length;
  }, [answers, isAnswerFilled]);

  // Navigation handlers
  const handleSelectQuestion = (questionId: string) => {
    setSelectedQuestionId(questionId);
    // Scroll to top of workspace
    document
      .getElementById("exam-workspace")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectSubQuestion = (subQuestionId: string) => {
    // Scroll to the specific subquestion
    const element = document.getElementById(`subq-${subQuestionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePrevQuestion = () => {
    if (!paper?.questions) return;
    const currentIndex = paper.questions.findIndex(
      (q) => q.id === selectedQuestionId
    );
    if (currentIndex > 0) {
      handleSelectQuestion(paper.questions[currentIndex - 1].id);
    }
  };

  const handleNextQuestion = () => {
    if (!paper?.questions) return;
    const currentIndex = paper.questions.findIndex(
      (q) => q.id === selectedQuestionId
    );
    if (currentIndex < paper.questions.length - 1) {
      handleSelectQuestion(paper.questions[currentIndex + 1].id);
    }
  };

  const currentQuestionIndex =
    paper?.questions?.findIndex((q) => q.id === selectedQuestionId) ?? -1;
  const canGoPrev = currentQuestionIndex > 0;
  const canGoNext = currentQuestionIndex < (paper?.questions?.length ?? 0) - 1;

  const selectedQuestion = paper?.questions?.find(
    (q) => q.id === selectedQuestionId
  );

  // Handler to start exam and enter fullscreen
  const handleStartExam = async () => {
    if (!canStartExam || isStarting) return;
    if (isDevToolsOpen) {
      alert("Please close Developer Tools before starting the exam.");
      return;
    }

    setIsStarting(true);
    setSubmissionError(null);
    try {
      await enterFullscreen();
    } catch (err) {
      console.error("Error entering fullscreen:", err);
    }
    try {
      const result = await backendApiFetch<ExamAttempt>("/submissions/start", {
        method: "POST",
        body: JSON.stringify({ paperId: assessmentId }),
      });
      if (!result.success) throw new Error(result.error || "Could not start the exam.");
      if (!result.data) throw new Error("Could not start the exam.");
      const attempt = result.data;
      setAttemptId(attempt.id);
      setAttemptDeadlineAt(new Date(attempt.deadlineAt).getTime());
      const restoredAnswers = Object.fromEntries(
        attempt.answers.map((answer) => [answer.subQuestionId, answer.answerText])
      );
      answersRef.current = restoredAnswers;
      setAnswers(restoredAnswers);
      setHasStartedExam(true);
      if (attempt.status !== "IN_PROGRESS") setSubmitted(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Could not start the exam.");
    } finally {
      setIsStarting(false);
    }
  };

  // Early returns after all hooks have been called
  if (!user) {
    return <div>Please log in to take the assessment.</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <StatePanel
          kind="loading"
          title="Preparing your assessment"
          description="Please wait while we load the exam."
          className="w-full max-w-2xl"
        />
      </div>
    );
  }

  if (isError || !paper) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <StatePanel
          kind="error"
          title="Couldn’t load the assessment"
          description={error instanceof Error ? error.message : "Please try again."}
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          }
          className="w-full max-w-2xl"
        />
      </div>
    );
  }

  // Show start screen before exam begins
  if (!hasStartedExam && !submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full space-y-6">
          <Card className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-foreground">
                {paper.title}
              </h1>
              <p className="text-lg text-muted-foreground">{paper.description}</p>
            </div>

            <div className="border-t border-b py-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Duration:</span>
                <span className="text-foreground">
                  {paper.durationMinutes} minutes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">
                  Total Questions:
                </span>
                <span className="text-foreground">{paper.questions?.length}</span>
              </div>
            </div>

            <div className="bg-warning/15 border border-warning/30 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-warning-foreground flex items-center gap-2">
                ⚠️ Important Instructions
              </h3>
              <ul className="text-sm text-warning-foreground space-y-1 list-disc list-inside">
                <li>The exam will open in fullscreen mode</li>
                <li>Do not exit fullscreen or switch windows</li>
                <li>Copy/paste and right-click are disabled</li>
                <li>DevTools and keyboard shortcuts are blocked</li>
                <li>Make sure you have a stable internet connection</li>
                <li className="font-semibold">
                  Close Developer Tools if open before starting
                </li>
              </ul>
            </div>

            {isDevToolsOpen && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-destructive flex items-center gap-2">
                  🚫 Developer Tools Detected
                </h3>
                <p className="text-sm text-destructive">
                  Please close Developer Tools (DevTools) before starting the
                  exam. Press F12 or close the DevTools panel to continue.
                </p>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleStartExam}
              disabled={isDevToolsOpen || !canStartExam || isStarting}
            >
              {isStarting
                ? "Opening exam..."
                : isDevToolsOpen
                ? "Close DevTools to Start"
                : currentTime < startsAt
                ? "Exam Not Open Yet"
                : "Start or Resume Exam"}
            </Button>
            {submissionError && <p role="alert" className="text-center text-sm text-destructive">{submissionError}</p>}
            {!canStartExam && (
              <p className="text-center text-sm text-muted-foreground">
                {currentTime < startsAt
                  ? `The exam opens ${new Date(paper.startDate).toLocaleString()}.`
                  : "The exam submission window has closed."}
              </p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-2xl w-full space-y-6">
          <Card className="p-8 text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-foreground">
              Submission received
            </h2>
            <p className="text-base text-muted-foreground">
              {totalAnswers} answer{totalAnswers !== 1 ? "s" : ""} submitted
            </p>
            <Button
              className="w-full mt-6"
              onClick={() => {
                // Exit fullscreen before navigation
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch((err) => {
                    console.error("Error exiting fullscreen:", err);
                  });
                }
                window.location.href = "/student/assessments";
              }}
            >
              Back to dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state during submission
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-2xl w-full space-y-6">
          <Card className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Submitting your assessment...
            </h2>
            <p className="text-base text-muted-foreground">
              Please wait while we process your submission
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <CalculatorPopup />
      <div className="h-screen flex flex-col bg-muted/30">
        {/* Fullscreen Exit Lock Overlay */}
        {isExamLocked && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
            <Card className="max-w-md w-full mx-4 p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Lock className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-bold text-destructive">
                  Exam Interface Locked
                </h2>
                <p className="text-foreground">
                  {lockReason
                    ? getSecurityViolationMessage(lockReason)
                    : "The exam interface has been locked to maintain exam integrity."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Ask an admin for the unlock code, enter it below, then return
                  to fullscreen to continue.
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Admin unlock code
                  </label>
                  <Input
                    value={adminUnlockCode}
                    onChange={(e) => setAdminUnlockCode(e.target.value)}
                    placeholder="Enter admin code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={isUnlocking}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleUnlockWithAdminCode();
                      }
                    }}
                  />
                </div>
                {unlockError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {unlockError}
                  </div>
                ) : null}
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleUnlockWithAdminCode}
                  disabled={isUnlocking}
                >
                  <KeyRound className="h-4 w-4" />
                  {isUnlocking ? "Verifying code..." : "Unlock Exam"}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Security incidents are logged for review.
              </p>
            </Card>
          </div>
        )}

        {/* Top App Bar */}
        <TopAppBar
          title={paper.title}
          subject={paper.description}
          timeRemaining={timeRemaining}
          onQuit={handleQuit}
          onSubmit={handleSubmit}
          canSubmitEarly={canSubmitEarly}
          earlySubmitDisabledMessage={earlySubmitDisabledMessage}
          draftSaveState={draftSaveState}
        />

        {/* Main Content Area */}
        <div className="container mx-auto flex min-h-0 flex-1 flex-col overflow-hidden pt-16 sm:flex-row sm:pt-20">
          {/* Center Workspace */}
          <div id="exam-workspace" className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-6">
            <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
              {selectedQuestion ? (
                <QuestionCard
                  question={selectedQuestion}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                  readonly={isExamLocked}
                />
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Select a question from the right panel
                </div>
              )}

              {/* Error message */}
              {submissionError && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="mt-1 text-sm text-destructive">{submissionError}</p>
                </div>
              )}

              {/* Submit Button at bottom */}
              <div className="mt-8 pb-8 flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  className="gap-2 px-8"
                  disabled={isSubmitting || !canSubmitEarly}
                  title={
                    !canSubmitEarly
                      ? earlySubmitDisabledMessage
                      : ""
                  }
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Submitting..." : "Submit Assessment"}
                </Button>
                {!canSubmitEarly && earlySubmitDisabledMessage ? (
                  <p className="text-sm text-muted-foreground text-center">
                    {earlySubmitDisabledMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Navigator */}
          <RightNavigator
            questions={navigationData}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={handleSelectQuestion}
            onSelectSubQuestion={handleSelectSubQuestion}
            onPrevQuestion={handlePrevQuestion}
            onNextQuestion={handleNextQuestion}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
          />
        </div>
      </div>
    </>
  );
}
