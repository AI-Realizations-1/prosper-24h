import { Router } from 'express';
import { FearEventController } from '../controllers/FearEventController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, FearEventController.create);
router.get('/', authMiddleware, FearEventController.list);
router.patch('/:id', authMiddleware, FearEventController.update);
router.delete('/:id', authMiddleware, FearEventController.delete);

export default router;
