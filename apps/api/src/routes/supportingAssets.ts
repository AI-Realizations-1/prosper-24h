import { Router } from 'express';
import { SupportingAssetController } from '../controllers/SupportingAssetController';
import { authMiddleware } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, SupportingAssetController.create);
router.get('/', authMiddleware, SupportingAssetController.list);
router.patch('/:id', authMiddleware, SupportingAssetController.update);
router.delete('/:id', authMiddleware, SupportingAssetController.delete);

export default router;
