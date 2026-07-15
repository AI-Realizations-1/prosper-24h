import { Router } from 'express';
import { BusinessValueController } from '../controllers/BusinessValueController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, BusinessValueController.create);
router.get('/', authMiddleware, BusinessValueController.list);
router.patch('/:id', authMiddleware, BusinessValueController.update);
router.delete('/:id', authMiddleware, BusinessValueController.delete);

export default router;
