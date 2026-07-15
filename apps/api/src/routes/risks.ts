import { Router } from 'express';
import { RiskController } from '../controllers/RiskController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, RiskController.create);
router.get('/', authMiddleware, RiskController.getAll);
router.patch('/:id', authMiddleware, RiskController.update);
router.delete('/:id', authMiddleware, RiskController.delete);

export default router;
