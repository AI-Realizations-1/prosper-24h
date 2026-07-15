import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/AuthController';
import { csrfMiddleware } from '../middleware/csrf';
import { authMiddleware } from '../middleware/auth';
import { AuthService } from '../services/AuthService';

const router = Router();

// GET /api/auth/csrf — fournit un token CSRF (non mutant, pas de vérification)
router.get('/csrf', AuthController.csrf);

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// /refresh lit le cookie httpOnly + vérifie CSRF
router.post('/refresh', csrfMiddleware, AuthController.refresh);

// /logout efface le cookie
router.post('/logout', AuthController.logout);

// POST /api/auth/logout-all — révoque tous les refresh tokens de l'utilisateur courant
router.post('/logout-all', authMiddleware, async (req: Request, res: Response) => {
  await AuthService.revokeAllRefreshTokens(req.userId!);
  res.clearCookie('prosper_refresh', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  });
  res.json({ message: 'Toutes les sessions révoquées.' });
});

// GET /api/auth/sessions — liste les sessions actives de l'utilisateur courant
router.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
  const sessions = await AuthService.listActiveSessions(req.userId!);
  res.json({ sessions });
});

export default router;
