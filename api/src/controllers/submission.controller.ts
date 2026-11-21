import { UserRole } from '@prisma/client';
import { NextFunction, Response } from 'express';

import { submissionService } from '../services/submission.service';
import type { AuthenticatedRequest } from '../types/http';
import type {
  CreateSubmissionInput,
  GradeSubmissionInput,
  ListSubmissionsQuery,
  SaveDraftInput,
  StartAttemptInput,
} from '../schemas/submission.schema';
import { sendSuccess } from '../utils/response';

export const submissionController = {
  startAttempt: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const payload = req.body as StartAttemptInput;
      const attempt = await submissionService.startAttempt(req.user, payload.paperId);
      sendSuccess(res, 200, 'Exam attempt ready', attempt);
    } catch (error) {
      next(error);
    }
  },

  saveDraft: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const { id } = req.params as unknown as { id: string };
      const result = await submissionService.saveDraft(req.user, id, req.body as SaveDraftInput);
      sendSuccess(res, 200, 'Draft saved', result);
    } catch (error) {
      next(error);
    }
  },

  submitAttempt: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const { id } = req.params as unknown as { id: string };
      const result = await submissionService.submitAttempt(req.user, id, req.body as SaveDraftInput);
      sendSuccess(res, 200, 'Submission created', result);
    } catch (error) {
      next(error);
    }
  },

  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const query = req.query as ListSubmissionsQuery;
      const submissions = await submissionService.list(req.user, query);
      sendSuccess(res, 200, 'Submissions retrieved', submissions);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { id } = req.params as unknown as { id: string };
      const submission = await submissionService.getById(req.user, id);
      sendSuccess(res, 200, 'Submission retrieved', submission);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (req.user.role !== UserRole.STUDENT) {
        return res.status(403).json({ message: 'Only students can submit answers' });
      }

      const payload = req.body as CreateSubmissionInput;
      const submission = await submissionService.create(req.user, payload);
      sendSuccess(res, 201, 'Submission created', submission);
    } catch (error) {
      next(error);
    }
  },

  grade: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { id } = req.params as unknown as { id: string };
      const payload = req.body as GradeSubmissionInput;
      const submission = await submissionService.grade(req.user, id, payload);
      sendSuccess(res, 200, 'Submission graded', submission);
    } catch (error) {
      next(error);
    }
  },
};
