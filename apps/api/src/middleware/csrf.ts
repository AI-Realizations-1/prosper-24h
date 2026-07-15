import { Request, Response, NextFunction } from 'express';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET ?? 'dev-csrf-secret';

/**
 * Génère un token CSRF signé (HMAC-SHA256 sur 32 octets aléatoires).
 * Format : <nonce>.<signature>
 */
export function generateCsrfToken(): string {
  const nonce = randomBytes(32).toString('hex');
  const sig = createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex');
  return `${nonce}.${sig}`;
}

/**
 * Vérifie qu'un token CSRF est valide (signature correcte).
 */
export function verifyCsrfToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [nonce, sig] = parts;
  const expected = createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Middleware CSRF : vérifie le header X-CSRF-Token pour les méthodes mutantes
 * lorsque la requête transporte un cookie de session.
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (!mutating) {
    next();
    return;
  }

  const headerToken = req.headers['x-csrf-token'] as string | undefined;

  if (!headerToken || !verifyCsrfToken(headerToken)) {
    res.status(403).json({ error: 'Invalid or missing CSRF token' });
    return;
  }

  next();
}
