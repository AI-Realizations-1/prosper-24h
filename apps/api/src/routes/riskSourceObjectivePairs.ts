import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { RiskSourceObjectivePairController } from '../controllers/RiskSourceObjectivePairController';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, RiskSourceObjectivePairController.getAll);
router.get('/retained', authMiddleware, RiskSourceObjectivePairController.getRetained);
router.post('/', authMiddleware, RiskSourceObjectivePairController.create);
router.patch('/:id/relevance', authMiddleware, RiskSourceObjectivePairController.updateRelevance);
router.delete('/:id', authMiddleware, RiskSourceObjectivePairController.delete);

export default router;
