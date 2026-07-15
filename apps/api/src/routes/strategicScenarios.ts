import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { StrategicScenarioController } from '../controllers/StrategicScenarioController';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, StrategicScenarioController.getAll);
router.post('/', authMiddleware, StrategicScenarioController.create);
router.patch('/:id/likelihood', authMiddleware, StrategicScenarioController.updateLikelihood);
router.post('/:id/stakeholders', authMiddleware, StrategicScenarioController.addStakeholder);
router.delete('/:id/stakeholders/:stakeholderId', authMiddleware, StrategicScenarioController.removeStakeholder);
router.delete('/:id', authMiddleware, StrategicScenarioController.delete);

export default router;
