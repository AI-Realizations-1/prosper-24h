import { Router } from 'express';
import { SecurityBaselineController } from '../controllers/SecurityBaselineController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, SecurityBaselineController.create);
router.get('/', authMiddleware, SecurityBaselineController.list);
router.patch('/:id', authMiddleware, SecurityBaselineController.update);
router.delete('/:id', authMiddleware, SecurityBaselineController.delete);

export default router;
