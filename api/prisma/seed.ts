import {
  AccessStatus,
  PaperStatus,
  PrismaClient,
  QuestionType,
  SubmissionStatus,
  UserRole,
} from "@prisma/client";

import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();
const DRAWING_QUESTION_TYPE = QuestionType.DRAWING;
const MCQ_QUESTION_TYPE = QuestionType.MCQ;
const DESCRIPTIVE_QUESTION_TYPE = QuestionType.DESCRIPTIVE;
const SAMPLE_MCQ_OPTIONS = {
  options: [
    { label: "Option A", value: "a" },
    { label: "Option B", value: "b" },
    { label: "Option C", value: "c" },
    { label: "Option D", value: "d" },
  ],
};
type SubQuestionSeed = {
  label: string;
  question: string;
  marks: number;
  position: number;
  questionType?: "DESCRIPTIVE" | "MCQ" | "DRAWING";
  mcqOptions?: { options: Array<{ label: string; value: string }> };
};

type QuestionSeed = {
  position: number;
  contentHtml: string;
  marks: number;
  subQuestions: SubQuestionSeed[];
};

type PaperSeed = {
  title: string;
  description: string;
  status?: PaperStatus;
  durationMinutes: number;
  startDate: Date;
  endDate: Date;
  earlySubmissionRestrictionMinutes: number;
  questions: QuestionSeed[];
};

async function createUser({
  email,
  name,
  role,
  password,
  schoolCode,
}: {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  schoolCode?: string;
}) {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      schoolCode,
      passwordHash,
    },
    create: {
      email,
      name,
      role,
      schoolCode,
      passwordHash,
    },
  });
}

async function createPaper(adminId: string, seed: PaperSeed) {
  const existingPaper = await prisma.questionPaper.findFirst({
    where: { title: seed.title },
    select: { id: true },
  });

  if (existingPaper) {
    await prisma.questionPaper.delete({
      where: { id: existingPaper.id },
    });
  }

  return prisma.questionPaper.create({
    data: {
      title: seed.title,
      description: seed.description,
      durationMinutes: seed.durationMinutes,
      startDate: seed.startDate,
      endDate: seed.endDate,
      status: seed.status ?? PaperStatus.PUBLISHED,
      earlySubmissionRestrictionMinutes: seed.earlySubmissionRestrictionMinutes,
      createdBy: adminId,
      questions: {
        create: seed.questions.map((question) => ({
          contentHtml: question.contentHtml,
          marks: question.marks,
          position: question.position,
          subQuestions: {
            create: question.subQuestions.map((subQuestion) => ({
              label: subQuestion.label,
              question: subQuestion.question,
              marks: subQuestion.marks,
              position: subQuestion.position,
              questionType:
                subQuestion.questionType ?? DESCRIPTIVE_QUESTION_TYPE,
              mcqOptions: subQuestion.mcqOptions,
            })),
          },
        })),
      },
    },
    include: { questions: { include: { subQuestions: true } } },
  });
}

async function createAccessRequest({
  studentId,
  paperId,
  status,
  adminId,
}: {
  studentId: string;
  paperId: string;
  status: AccessStatus;
  adminId: string;
}) {
  const decided = status !== AccessStatus.PENDING;
  return prisma.accessRequest.upsert({
    where: { studentId_paperId: { studentId, paperId } },
    update: {
      status,
      decidedById: decided ? adminId : null,
      decidedAt: decided ? new Date() : null,
    },
    create: {
      studentId,
      paperId,
      status,
      decidedById: decided ? adminId : null,
      decidedAt: decided ? new Date() : null,
    },
  });
}

async function createSubmissionScenario({
  studentId,
  adminId,
  paper,
  status,
  startedAt,
  submittedAt,
  answers = [],
  grades = [],
}: {
  studentId: string;
  adminId: string;
  paper: Awaited<ReturnType<typeof createPaper>>;
  status: SubmissionStatus;
  startedAt: Date;
  submittedAt: Date | null;
  answers?: { subQuestionId: string; answerText: string }[];
  grades?: {
    subQuestionId: string;
    assignedMarks: number | null;
    comment?: string;
  }[];
}) {
  return prisma.submission.create({
    data: {
      studentId,
      paperId: paper.id,
      status,
      startedAt,
      submittedAt,
      answers: { create: answers },
      grades: {
        create: grades.map((grade) => ({
          ...grade,
          gradedById: adminId,
        })),
      },
    },
  });
}

const getSubQuestionIds = (paper: Awaited<ReturnType<typeof createPaper>>) =>
  paper.questions.flatMap((question) =>
    question.subQuestions.map((subQuestion) => subQuestion.id),
  );

async function main() {
  const admin = await createUser({
    email: "admin@exam.io",
    name: "Exam Admin",
    role: UserRole.ADMIN,
    password: "changeMeAdmin1!",
  });

  const studentA = await createUser({
    email: "student1@exam.io",
    name: "Jane Student",
    schoolCode: "SCHOOL-001",
    role: UserRole.STUDENT,
    password: "changeMeStudent1!",
  });

  const studentB = await createUser({
    email: "student2@exam.io",
    name: "John Candidate",
    schoolCode: "SCHOOL-002",
    role: UserRole.STUDENT,
    password: "changeMeStudent2!",
  });

  const studentC = await createUser({
    email: "student3@exam.io",
    name: "Student 3",
    schoolCode: "SCHOOL-003",
    role: UserRole.STUDENT,
    password: "changeMeStudent3!",
  });

  const now = new Date();
  const livePaper = await createPaper(admin.id, {
    title: "All Question Types Paper",
    description:
      "Live v1.0 beta exam with descriptive, single-choice MCQ, and drawing questions",
    durationMinutes: 120,
    startDate: new Date(now.getTime() - 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 3 * 60 * 60 * 1000),
    earlySubmissionRestrictionMinutes: 10,
    questions: [
      {
        position: 1,
        contentHtml: "<p>Factorise the quadratic expression 2x^2 + 7x + 3.</p>",
        marks: 10,
        subQuestions: [
          {
            label: "a",
            question: "Show your working",
            marks: 6,
            position: 1,
          },
          {
            label: "b",
            question: "Provide the factors",
            marks: 4,
            position: 2,
          },
        ],
      },
      {
        position: 2,
        contentHtml:
          "<p>Choose the correct answer for the simplified form of 3x + 4x.</p>",
        marks: 10,
        subQuestions: [
          {
            label: "a",
            question: "Select the correct option",
            marks: 10,
            position: 1,
            questionType: MCQ_QUESTION_TYPE,
            mcqOptions: SAMPLE_MCQ_OPTIONS,
          },
        ],
      },
      {
        position: 3,
        contentHtml:
          "<p>Create a sketch that shows a square, a curved line, and an arrow.</p>",
        marks: 10,
        subQuestions: [
          {
            label: "a",
            question: "Draw the requested shapes on the canvas",
            marks: 10,
            position: 1,
            questionType: DRAWING_QUESTION_TYPE,
          },
        ],
      },
    ],
  });
  const accessScenarioPaper = await createPaper(admin.id, {
    title: "Beta Question Type Examples Paper",
    description:
      "Upcoming paper for approved, pending, and rejected access examples",
    durationMinutes: 75,
    startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 26 * 60 * 60 * 1000),
    earlySubmissionRestrictionMinutes: 10,
    questions: [
      {
        position: 1,
        contentHtml:
          "<p>Explain how you would solve the equation 2x + 5 = 13.</p>",
        marks: 10,
        subQuestions: [
          {
            label: "a",
            question: "Show your working and state the value of x.",
            marks: 10,
            position: 1,
            questionType: DESCRIPTIVE_QUESTION_TYPE,
          },
        ],
      },
      {
        position: 2,
        contentHtml: "<p>Which value of x satisfies 3x = 18?</p>",
        marks: 5,
        subQuestions: [
          {
            label: "a",
            question: "Select the correct value of x.",
            marks: 5,
            position: 1,
            questionType: MCQ_QUESTION_TYPE,
            mcqOptions: {
              options: [
                { label: "x = 3", value: "3" },
                { label: "x = 6", value: "6" },
                { label: "x = 9", value: "9" },
              ],
            },
          },
        ],
      },
      {
        position: 3,
        contentHtml:
          "<p>Sketch a number line from 0 to 10 and mark the value 7.</p>",
        marks: 10,
        subQuestions: [
          {
            label: "a",
            question: "Draw the number line and mark 7.",
            marks: 10,
            position: 1,
            questionType: DRAWING_QUESTION_TYPE,
          },
        ],
      },
    ],
  });
  const reviewStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const reviewEnd = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  const reviewPaper = await createPaper(admin.id, {
    title: "Submission Review Scenarios Paper",
    description:
      "Past assessment with ungraded, partially graded, and reviewed submissions",
    durationMinutes: 90,
    startDate: reviewStart,
    endDate: reviewEnd,
    earlySubmissionRestrictionMinutes: 0,
    questions: [
      {
        position: 1,
        contentHtml: "<p>Answer the following algebra questions.</p>",
        marks: 15,
        subQuestions: [
          { label: "a", question: "Solve 2x + 5 = 13.", marks: 5, position: 1 },
          {
            label: "b",
            question: "Factorise x² + 5x + 6.",
            marks: 5,
            position: 2,
          },
          {
            label: "c",
            question: "Explain how you checked your answer.",
            marks: 5,
            position: 3,
          },
        ],
      },
    ],
  });

  const draftPaper = await createPaper(admin.id, {
    title: "Draft Admin Preview Paper",
    description: "Draft paper visible to admins but not students",
    status: PaperStatus.DRAFT,
    durationMinutes: 45,
    startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
    earlySubmissionRestrictionMinutes: 0,
    questions: [
      {
        position: 1,
        contentHtml: "<p>Draft question for the admin preview.</p>",
        marks: 5,
        subQuestions: [
          { label: "a", question: "What is 2 + 3?", marks: 5, position: 1 },
        ],
      },
    ],
  });

  await Promise.all([
    createAccessRequest({
      studentId: studentA.id,
      paperId: livePaper.id,
      status: AccessStatus.APPROVED,
      adminId: admin.id,
    }),
    createAccessRequest({
      studentId: studentA.id,
      paperId: accessScenarioPaper.id,
      status: AccessStatus.APPROVED,
      adminId: admin.id,
    }),
    createAccessRequest({
      studentId: studentB.id,
      paperId: accessScenarioPaper.id,
      status: AccessStatus.REJECTED,
      adminId: admin.id,
    }),
    createAccessRequest({
      studentId: studentC.id,
      paperId: accessScenarioPaper.id,
      status: AccessStatus.PENDING,
      adminId: admin.id,
    }),
    ...[studentA, studentB, studentC].map((student) =>
      createAccessRequest({
        studentId: student.id,
        paperId: reviewPaper.id,
        status: AccessStatus.APPROVED,
        adminId: admin.id,
      }),
    ),
  ]);

  const liveSubQuestionIds = getSubQuestionIds(livePaper);
  await createSubmissionScenario({
    studentId: studentA.id,
    adminId: admin.id,
    paper: livePaper,
    status: SubmissionStatus.IN_PROGRESS,
    startedAt: new Date(now.getTime() - 15 * 60 * 1000),
    submittedAt: null,
    answers: [
      {
        subQuestionId: liveSubQuestionIds[0],
        answerText: "2x² + 7x + 3 = (2x + 1)(x + 3).",
      },
    ],
  });

  const reviewSubQuestionIds = getSubQuestionIds(reviewPaper);
  const reviewStartedAt = new Date(reviewStart.getTime() + 10 * 60 * 1000);
  const reviewSubmittedAt = new Date(
    reviewStartedAt.getTime() + 90 * 60 * 1000,
  );
  const reviewAnswers = reviewSubQuestionIds.map((subQuestionId, index) => ({
    subQuestionId,
    answerText: [
      "x = 4",
      "(x + 2)(x + 3)",
      "I substituted the result into the original expression.",
    ][index],
  }));

  await Promise.all([
    createSubmissionScenario({
      studentId: studentA.id,
      adminId: admin.id,
      paper: reviewPaper,
      status: SubmissionStatus.SUBMITTED,
      startedAt: reviewStartedAt,
      submittedAt: reviewSubmittedAt,
      answers: reviewAnswers,
    }),
    createSubmissionScenario({
      studentId: studentB.id,
      adminId: admin.id,
      paper: reviewPaper,
      status: SubmissionStatus.REVIEWED,
      startedAt: reviewStartedAt,
      submittedAt: reviewSubmittedAt,
      answers: reviewAnswers,
      grades: reviewSubQuestionIds.map((subQuestionId, index) => ({
        subQuestionId,
        assignedMarks: [5, 4, 5][index],
        comment: "Good work. Check the final step for clarity.",
      })),
    }),
    createSubmissionScenario({
      studentId: studentC.id,
      adminId: admin.id,
      paper: reviewPaper,
      status: SubmissionStatus.SUBMITTED,
      startedAt: reviewStartedAt,
      submittedAt: reviewSubmittedAt,
      answers: reviewAnswers,
      grades: [
        {
          subQuestionId: reviewSubQuestionIds[0],
          assignedMarks: 4,
          comment: "Most steps are correct.",
        },
        {
          subQuestionId: reviewSubQuestionIds[1],
          assignedMarks: null,
          comment: "Revisit the factorisation.",
        },
      ],
    }),
  ]);

  console.info("Seed completed", {
    adminEmail: admin.email,
    studentEmails: [studentA.email, studentB.email, studentC.email],
    paperTitles: [
      livePaper.title,
      accessScenarioPaper.title,
      reviewPaper.title,
      draftPaper.title,
    ],
    scenarios: [
      "approved student with in-progress attempt and saved answer",
      "upcoming paper with approved, rejected, and pending requests",
      "live paper visible without an access request to other students",
      "ungraded submission awaiting review",
      "reviewed submission with scores and comments",
      "partially graded submission with an explicitly ungraded mark",
      "draft paper visible to admins",
    ],
  });
}

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
