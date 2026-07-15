import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { RiskSourceController } from '../controllers/RiskSourceController';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, RiskSourceController.getAll);
router.post('/', authMiddleware, RiskSourceController.create);
router.patch('/:id', authMiddleware, RiskSourceController.update);
router.delete('/:id', authMiddleware, RiskSourceController.delete);

export default router;
