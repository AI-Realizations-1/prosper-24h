import { Router } from 'express';
import { SecurityMeasureController } from '../controllers/SecurityMeasureController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, SecurityMeasureController.create);
router.get('/', authMiddleware, SecurityMeasureController.getAll);
router.patch('/:id', authMiddleware, SecurityMeasureController.update);
router.delete('/:id', authMiddleware, SecurityMeasureController.delete);

export default router;
