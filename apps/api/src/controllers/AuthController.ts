import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { generateCsrfToken } from '../middleware/csrf';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const COOKIE_NAME = 'prosper_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  path: '/api/auth',
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
}

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      const result = await AuthService.register(email, password);
      setRefreshCookie(res, result.refreshToken);
      res.status(201).json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      const result = await AuthService.login(email, password);
      setRefreshCookie(res, result.refreshToken);
      res.json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const rawToken: string | undefined = req.cookies?.[COOKIE_NAME];
    if (!rawToken) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    const result = await AuthService.rotateRefreshToken(rawToken);
    if (!result) {
      clearRefreshCookie(res);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    setRefreshCookie(res, result.refreshToken);
    res.json({
      accessToken: result.accessToken,
      userId: result.userId,
      role: result.role,
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const rawToken: string | undefined = req.cookies?.[COOKIE_NAME];
    if (rawToken) {
      await AuthService.revokeRefreshToken(rawToken).catch(() => {/* best effort */});
    }
    clearRefreshCookie(res);
    res.json({ ok: true });
  }

  static csrf(_req: Request, res: Response): void {
    const csrfToken = generateCsrfToken();
    res.json({ csrfToken });
  }
}
