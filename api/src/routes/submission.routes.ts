import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { submissionController } from '../controllers/submission.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createSubmissionSchema,
  gradeSubmissionSchema,
  listSubmissionsQuerySchema,
  saveDraftSchema,
  startAttemptSchema,
  submitAttemptSchema,
  submissionIdParamSchema,
} from '../schemas/submission.schema';

const router = Router();

router.get(
  '/',
  requireAuth(),
  validateRequest(listSubmissionsQuerySchema, 'query'),
  submissionController.list
);

router.post(
  '/start',
  requireAuth([UserRole.STUDENT]),
  validateRequest(startAttemptSchema),
  submissionController.startAttempt
);

router.get(
  '/:id',
  requireAuth(),
  validateRequest(submissionIdParamSchema, 'params'),
  submissionController.getById
);

router.post('/', requireAuth([UserRole.STUDENT]), validateRequest(createSubmissionSchema), submissionController.create);

router.put(
  '/:id/draft',
  requireAuth([UserRole.STUDENT]),
  validateRequest(submissionIdParamSchema, 'params'),
  validateRequest(saveDraftSchema),
  submissionController.saveDraft
);

router.post(
  '/:id/submit',
  requireAuth([UserRole.STUDENT]),
  validateRequest(submissionIdParamSchema, 'params'),
  validateRequest(submitAttemptSchema),
  submissionController.submitAttempt
);

router.post(
  '/:id/grades',
  requireAuth([UserRole.ADMIN]),
  validateRequest(submissionIdParamSchema, 'params'),
  validateRequest(gradeSubmissionSchema),
  submissionController.grade
);

export default router;
