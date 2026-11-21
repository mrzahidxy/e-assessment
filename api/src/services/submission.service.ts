import {
  AccessStatus,
  PaperStatus,
  QuestionType,
  SubmissionStatus,
  UserRole,
  Prisma,
} from '@prisma/client';

import {
  CreateSubmissionInput,
  GradeSubmissionInput,
  ListSubmissionsQuery,
  SaveDraftInput,
} from '../schemas/submission.schema';
import { AuthenticatedUser } from '../types/user';
import { prisma } from '../utils/prisma';
import { HttpError } from '../utils/http-error';
import { validateDrawingAnswer } from '../validators/drawing-answer.validator';
import { validateInteractiveTableAnswer } from '../validators/interactive-table.validator';

const submissionListInclude = {
  student: {
    select: { id: true, name: true, email: true, schoolCode: true },
  },
  paper: {
    select: { id: true, title: true },
  },
} as const;

const submissionPaperSelect = {
  id: true,
  title: true,
  description: true,
  questions: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      paperId: true,
      contentHtml: true,
      marks: true,
      position: true,
      subQuestions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          questionId: true,
          label: true,
          question: true,
          marks: true,
          questionType: true,
          template: true,
          mcqOptions: true,
          circuitTemplate: true,
          imageCompositionTemplate: true,
          position: true,
        },
      },
    },
  },
} as const;

const submissionInclude = {
  student: {
    select: { id: true, name: true, email: true, schoolCode: true },
  },
  paper: {
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
    },
  },
  answers: {
    include: {
      subQuestion: {
        select: {
          id: true,
          label: true,
          question: true,
          marks: true,
          questionId: true,
          questionType: true,
          template: true,
          mcqOptions: true,
          circuitTemplate: true,
          imageCompositionTemplate: true,
          position: true,
          questionRel: {
            select: {
              id: true,
              contentHtml: true,
              marks: true,
              position: true,
            },
          },
        },
      },
    },
  },
  grades: {
    include: {
      subQuestion: {
        select: {
          id: true,
          label: true,
          question: true,
          marks: true,
        },
      }
    },
  },
} as const;

const submissionDetailInclude = {
  student: {
    select: { id: true, name: true, email: true, schoolCode: true },
  },
  paper: {
    select: submissionPaperSelect,
  },
  answers: {
    select: {
      id: true,
      subQuestionId: true,
      answerText: true,
    },
  },
  grades: {
    select: {
      id: true,
      subQuestionId: true,
      assignedMarks: true,
      comment: true,
    },
  },
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

type SubmissionResponse = Prisma.SubmissionGetPayload<{
  include: typeof submissionInclude;
}>;

type SubmissionListItem = Prisma.SubmissionGetPayload<{
  include: typeof submissionListInclude;
}>;

type SubmissionPaper = Prisma.QuestionPaperGetPayload<{
  select: typeof submissionPaperSelect;
}>;

type SubmissionQuestion = SubmissionPaper['questions'][number];
type SubmissionSubQuestion = SubmissionQuestion['subQuestions'][number];

type SubmissionAnswer = {
  id: string;
  answerText: string;
  marks: {
    assigned: number | null;
    max: number;
  };
  comment: string | null;
};

type SubmissionDetailResponse = {
  id: string;
  status: SubmissionStatus;
  submittedAt: Date | null;
  student: {
    id: string;
    name: string;
    email: string;
    schoolCode: string | null;
  };
  paper: Omit<SubmissionPaper, 'questions'> & {
    questions: (Omit<SubmissionQuestion, 'subQuestions'> & {
      subQuestions: (SubmissionSubQuestion & {
        answer: SubmissionAnswer | null;
      })[];
    })[];
  };
};

const normalizePagination = (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? Math.floor(pageNumber) : DEFAULT_PAGE;
  const requestedLimit =
    Number.isFinite(limitNumber) && limitNumber > 0 ? Math.floor(limitNumber) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit };
};

const ensureStudentAccess = async (studentId: string, paperId: string) => {
  const request = await prisma.accessRequest.findUnique({
    where: {
      studentId_paperId: {
        studentId,
        paperId,
      },
    },
  });

  if (!request || request.status !== AccessStatus.APPROVED) {
    throw new HttpError(403, 'Access request must be approved before submitting');
  }
};

const isUniqueConstraintError = (error: unknown): error is { code: string } =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

const getAttemptDeadline = (startedAt: Date, durationMinutes: number, paperEndDate: Date) =>
  new Date(Math.min(startedAt.getTime() + durationMinutes * 60_000, paperEndDate.getTime()));

const validateAttemptAnswers = async (paperId: string, answers: SaveDraftInput['answers']) => {
  const subQuestions = await prisma.subQuestion.findMany({
    where: { questionRel: { paperId } },
    select: { id: true, questionType: true, template: true },
  });
  const subQuestionById = new Map(subQuestions.map((sub) => [sub.id, sub]));
  const seen = new Set<string>();

  for (const answer of answers) {
    if (seen.has(answer.subQuestionId)) {
      throw new HttpError(400, 'Duplicate sub-question answers are not allowed');
    }
    seen.add(answer.subQuestionId);
    const subQuestion = subQuestionById.get(answer.subQuestionId);
    if (!subQuestion) throw new HttpError(400, 'One or more answers reference invalid sub-questions');
    if (!answer.answerText) continue;
    if (subQuestion.questionType === QuestionType.INTERACTIVE_TABLE) {
      validateInteractiveTableAnswer(answer.answerText, subQuestion.template);
    }
    if (subQuestion.questionType === QuestionType.DRAWING) {
      validateDrawingAnswer(answer.answerText);
    }
  }
};

const getAttemptPayload = async (submissionId: string) => {
  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      answers: { select: { subQuestionId: true, answerText: true } },
      paper: { select: { durationMinutes: true, endDate: true } },
    },
  });
  return {
    id: submission.id,
    status: submission.status,
    startedAt: submission.startedAt,
    submittedAt: submission.submittedAt,
    deadlineAt: getAttemptDeadline(submission.startedAt, submission.paper.durationMinutes, submission.paper.endDate),
    answers: submission.answers,
  };
};

type AttemptPayload = {
  id: string;
  status: SubmissionStatus;
  startedAt: Date;
  submittedAt: Date | null;
  deadlineAt: Date;
  answers: { subQuestionId: string; answerText: string }[];
};

const filterForActor = (
  actor: AuthenticatedUser,
  query?: ListSubmissionsQuery
): Prisma.SubmissionWhereInput => {
  const where: Prisma.SubmissionWhereInput = {};

  if (actor.role === UserRole.STUDENT) {
    where.studentId = actor.id;
  } else if (query?.studentId) {
    where.studentId = query.studentId;
  }

  if (query?.paperId) {
    where.paperId = query.paperId;
  }

  if (query?.status) {
    where.status = query.status;
  } else if (actor.role === UserRole.ADMIN) {
    where.status = { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.REVIEWED] };
  }

  return where;
};

export const submissionService = {
  startAttempt: async (actor: AuthenticatedUser, paperId: string): Promise<AttemptPayload> => {
    if (actor.role !== UserRole.STUDENT) throw new HttpError(403, 'Only students can start an exam');
    const paper = await prisma.questionPaper.findUnique({
      where: { id: paperId },
      select: { id: true, status: true, startDate: true, endDate: true, durationMinutes: true },
    });
    if (!paper || paper.status !== PaperStatus.PUBLISHED) {
      throw new HttpError(400, 'Paper is not available for submissions');
    }
    await ensureStudentAccess(actor.id, paper.id);

    const existing = await prisma.submission.findUnique({
      where: { studentId_paperId: { studentId: actor.id, paperId } },
      select: { id: true, status: true, startedAt: true },
    });
    if (existing) {
      if (existing.status !== SubmissionStatus.IN_PROGRESS) {
        throw new HttpError(409, 'You have already submitted answers for this paper');
      }
      const deadlineAt = getAttemptDeadline(existing.startedAt, paper.durationMinutes, paper.endDate);
      if (Date.now() >= deadlineAt.getTime()) {
        await prisma.submission.updateMany({
          where: { id: existing.id, status: SubmissionStatus.IN_PROGRESS },
          data: { status: SubmissionStatus.SUBMITTED, submittedAt: deadlineAt },
        });
      }
      return getAttemptPayload(existing.id);
    }

    const now = new Date();
    if (paper.startDate.getTime() > now.getTime()) throw new HttpError(400, 'Exam has not started yet');
    if (paper.endDate.getTime() <= now.getTime()) throw new HttpError(400, 'Exam has already ended');

    try {
      const created = await prisma.submission.create({
        data: {
          studentId: actor.id,
          paperId,
          status: SubmissionStatus.IN_PROGRESS,
          startedAt: now,
        },
        select: { id: true },
      });
      return getAttemptPayload(created.id);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return submissionService.startAttempt(actor, paperId);
      }
      throw error;
    }
  },

  saveDraft: async (actor: AuthenticatedUser, submissionId: string, input: SaveDraftInput) => {
    if (actor.role !== UserRole.STUDENT) throw new HttpError(403, 'Only students can save exam answers');
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true, paperId: true, studentId: true, status: true, startedAt: true,
        paper: { select: { durationMinutes: true, endDate: true } },
      },
    });
    if (!submission) throw new HttpError(404, 'Exam attempt not found');
    if (submission.studentId !== actor.id) throw new HttpError(403, 'You do not have access to this exam attempt');
    if (submission.status !== SubmissionStatus.IN_PROGRESS) throw new HttpError(409, 'This exam attempt is already submitted');

    const deadlineAt = getAttemptDeadline(submission.startedAt, submission.paper.durationMinutes, submission.paper.endDate);
    if (Date.now() >= deadlineAt.getTime()) {
      await prisma.submission.updateMany({
        where: { id: submission.id, studentId: actor.id, status: SubmissionStatus.IN_PROGRESS },
        data: { status: SubmissionStatus.SUBMITTED, submittedAt: deadlineAt },
      });
      return getAttemptPayload(submission.id);
    }

    await validateAttemptAnswers(submission.paperId, input.answers);
    await prisma.$transaction(async (tx) => {
      const updated = await tx.$executeRaw`
        UPDATE "Submission" AS submission
        SET "updatedAt" = CURRENT_TIMESTAMP
        FROM "QuestionPaper" AS paper
        WHERE submission."id" = ${submission.id}::uuid
          AND submission."studentId" = ${actor.id}::uuid
          AND submission."status" = 'IN_PROGRESS'::"SubmissionStatus"
          AND paper."id" = submission."paperId"
          AND CURRENT_TIMESTAMP < LEAST(
            submission."startedAt" + paper."durationMinutes" * INTERVAL '1 minute',
            paper."endDate"
          )
      `;
      if (updated !== 1) throw new HttpError(409, 'This exam attempt is no longer accepting answers');
      await tx.answer.deleteMany({ where: { submissionId } });
      const answers = input.answers.filter((answer) => answer.answerText.length > 0);
      if (answers.length) {
        await tx.answer.createMany({
          data: answers.map((answer) => ({ submissionId, ...answer })),
        });
      }
    }, { timeout: 30_000 });
    return getAttemptPayload(submissionId);
  },

  submitAttempt: async (actor: AuthenticatedUser, submissionId: string, input: SaveDraftInput) => {
    if (actor.role !== UserRole.STUDENT) throw new HttpError(403, 'Only students can submit answers');
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true, studentId: true, paperId: true, status: true, startedAt: true,
        paper: { select: { durationMinutes: true, startDate: true, endDate: true, earlySubmissionRestrictionMinutes: true } },
      },
    });
    if (!submission) throw new HttpError(404, 'Exam attempt not found');
    if (submission.studentId !== actor.id) throw new HttpError(403, 'You do not have access to this exam attempt');
    if (submission.status !== SubmissionStatus.IN_PROGRESS) {
      return prisma.submission.findUniqueOrThrow({ where: { id: submissionId }, include: submissionInclude });
    }

    const deadlineAt = getAttemptDeadline(submission.startedAt, submission.paper.durationMinutes, submission.paper.endDate);
    const now = new Date();
    if (now.getTime() >= deadlineAt.getTime()) {
      await prisma.submission.updateMany({
        where: { id: submission.id, studentId: actor.id, status: SubmissionStatus.IN_PROGRESS },
        data: { status: SubmissionStatus.SUBMITTED, submittedAt: deadlineAt },
      });
      return prisma.submission.findUniqueOrThrow({ where: { id: submissionId }, include: submissionInclude });
    }

    const earliestSubmission = new Date(
      submission.paper.startDate.getTime() + (submission.paper.earlySubmissionRestrictionMinutes ?? 0) * 60_000
    );
    if (now.getTime() < earliestSubmission.getTime()) throw new HttpError(400, 'You cannot submit this early');
    await validateAttemptAnswers(submission.paperId, input.answers);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.submission.updateMany({
        where: { id: submission.id, studentId: actor.id, status: SubmissionStatus.IN_PROGRESS },
        data: { status: SubmissionStatus.SUBMITTED, submittedAt: now },
      });
      if (updated.count !== 1) throw new HttpError(409, 'This exam attempt has already been submitted');
      await tx.answer.deleteMany({ where: { submissionId } });
      const answers = input.answers.filter((answer) => answer.answerText.length > 0);
      if (answers.length) {
        await tx.answer.createMany({
          data: answers.map((answer) => ({ submissionId, ...answer })),
        });
      }
    }, { timeout: 30_000 });

    return prisma.submission.findUniqueOrThrow({ where: { id: submissionId }, include: submissionInclude });
  },

  list: async (
    actor: AuthenticatedUser,
    query?: ListSubmissionsQuery
  ): Promise<PaginatedResponse<SubmissionListItem>> => {
    const { page, limit } = normalizePagination(query?.page, query?.limit);
    const skip = (page - 1) * limit;
    const where = filterForActor(actor, query);

    const [submissions, totalItems] = await prisma.$transaction([
      prisma.submission.findMany({
        where,
        include: submissionListInclude,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.submission.count({ where }),
    ]);

    return {
      data: submissions,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  },

  getById: async (
    actor: AuthenticatedUser,
    submissionId: string
  ): Promise<SubmissionDetailResponse> => {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: submissionDetailInclude,
    });

    if (!submission) {
      throw new HttpError(404, 'Submission not found');
    }

    if (actor.role !== UserRole.ADMIN && submission.studentId !== actor.id) {
      throw new HttpError(403, 'You do not have access to this submission');
    }
    if (actor.role === UserRole.ADMIN && submission.status === SubmissionStatus.IN_PROGRESS) {
      throw new HttpError(409, 'This exam attempt has not been submitted yet');
    }

    const answersBySubQuestionId = new Map<
      string,
      { id: string; answerText: string }
    >(
      submission.answers.map((answer) => [
        answer.subQuestionId,
        {
          id: answer.id,
          answerText: answer.answerText,
        },
      ])
    );

    const gradesBySubQuestionId = new Map<
      string,
      {
        assignedMarks: number;
        comment: string | null;
      }
    >(
      submission.grades.map((grade) => [
        grade.subQuestionId,
        {
          assignedMarks: grade.assignedMarks,
          comment: grade.comment,
        },
      ])
    );

    const questionsWithResponses = submission.paper.questions.map((question) => ({
      ...question,
      subQuestions: question.subQuestions.map((subQuestion) => {
        const answer = answersBySubQuestionId.get(subQuestion.id);
        const grade = gradesBySubQuestionId.get(subQuestion.id);

        return {
          ...subQuestion,
          answer:
            answer !== undefined
              ? {
                ...answer,
                marks: {
                  assigned: grade?.assignedMarks ?? null,
                  max: subQuestion.marks,
                },
                comment: grade?.comment ?? null,
              }
              : null,
        };
      }),
    }));

    return {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      student: submission.student,
      paper: {
        ...submission.paper,
        questions: questionsWithResponses,
      },
    };
  },

  create: async (
    actor: AuthenticatedUser,
    input: CreateSubmissionInput
  ): Promise<SubmissionResponse> => {
    if (actor.role !== UserRole.STUDENT) throw new HttpError(403, 'Only students can submit answers');
    const attempt = await prisma.submission.findUnique({
      where: { studentId_paperId: { studentId: actor.id, paperId: input.paperId } },
      select: { id: true },
    });
    if (!attempt) throw new HttpError(409, 'Start the exam before submitting answers');
    return submissionService.submitAttempt(actor, attempt.id, input);
  },

  grade: async (
    actor: AuthenticatedUser,
    submissionId: string,
    input: GradeSubmissionInput
  ): Promise<SubmissionResponse> => {
    if (actor.role !== UserRole.ADMIN) {
      throw new HttpError(403, 'Only admins can grade submissions');
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        paperId: true,
        status: true,
      },
    });

    if (!submission) {
      throw new HttpError(404, 'Submission not found');
    }
    if (submission.status === SubmissionStatus.IN_PROGRESS) {
      throw new HttpError(409, 'This exam attempt has not been submitted yet');
    }

    const subQuestions = await prisma.subQuestion.findMany({
      where: { questionRel: { paperId: submission.paperId } },
      select: { id: true, marks: true },
    });
    const marksById = new Map(subQuestions.map((sub) => [sub.id, sub.marks]));
    const gradedSubQuestionIds = new Set<string>();

    for (const grade of input.grades) {
      if (!marksById.has(grade.subQuestionId)) {
        throw new HttpError(400, 'Invalid sub-question for grading');
      }

      if (gradedSubQuestionIds.has(grade.subQuestionId)) {
        throw new HttpError(400, 'Duplicate sub-question grades are not allowed');
      }
      gradedSubQuestionIds.add(grade.subQuestionId);

      const maxMarks = marksById.get(grade.subQuestionId) ?? 0;
      if (grade.assignedMarks > maxMarks) {
        throw new HttpError(400, 'Assigned marks exceed the maximum for a sub-question');
      }
    }

    if (gradedSubQuestionIds.size !== marksById.size) {
      throw new HttpError(400, 'Every sub-question must be graded before the submission is reviewed');
    }

    await prisma.$transaction(async (tx) => {
      for (const grade of input.grades) {
        const updateData: Prisma.GradeUpdateInput = {
          assignedMarks: grade.assignedMarks,
          gradedBy: {
            connect: {
              id: actor.id,
            },
          },
        };

        if (grade.comment !== undefined) {
          updateData.comment = grade.comment;
        }

        await tx.grade.upsert({
          where: {
            submissionId_subQuestionId: {
              submissionId,
              subQuestionId: grade.subQuestionId,
            },
          },
          update: updateData,
          create: {
            submission: {
              connect: {
                id: submissionId,
              },
            },
            subQuestion: {
              connect: {
                id: grade.subQuestionId,
              },
            },
            assignedMarks: grade.assignedMarks,
            gradedBy: {
              connect: {
                id: actor.id,
              },
            },
            comment: grade.comment ?? null,
          },
        });
      }

      await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.REVIEWED,
        },
      });
    });

    return prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: submissionInclude,
    });
  },
};
