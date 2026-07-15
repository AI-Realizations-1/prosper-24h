import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { StakeholderController } from '../controllers/StakeholderController';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, StakeholderController.getAll);
router.post('/', authMiddleware, StakeholderController.create);
router.patch('/:id', authMiddleware, StakeholderController.update);
router.delete('/:id', authMiddleware, StakeholderController.delete);

export default router;
