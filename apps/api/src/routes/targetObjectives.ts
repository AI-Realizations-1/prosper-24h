import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { TargetObjectiveController } from '../controllers/TargetObjectiveController';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, TargetObjectiveController.getAll);
router.post('/', authMiddleware, TargetObjectiveController.create);
router.patch('/:id', authMiddleware, TargetObjectiveController.update);
router.delete('/:id', authMiddleware, TargetObjectiveController.delete);

export default router;
