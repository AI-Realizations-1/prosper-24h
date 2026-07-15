import { Router } from 'express';
import { OperationalScenarioController } from '../controllers/OperationalScenarioController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, OperationalScenarioController.create);
router.get('/', authMiddleware, OperationalScenarioController.getAll);
router.patch('/:id', authMiddleware, OperationalScenarioController.update);
router.delete('/:id', authMiddleware, OperationalScenarioController.delete);

export default router;
