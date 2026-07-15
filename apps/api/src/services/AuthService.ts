import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/password';
import { signTokens, verifyRefreshToken } from '../utils/jwt';

const prisma = new PrismaClient();

const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export class AuthService {
  static async register(email: string, password: string, role: UserRole = UserRole.CONTRIBUTOR) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('User already exists');

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role },
    });

    const tokens = signTokens(user.id, user.role);
    await AuthService.storeRefreshToken(tokens.refreshToken, user.id);

    return { user: { id: user.id, email: user.email, role: user.role }, ...tokens };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    const passwordMatch = await verifyPassword(password, user.password);
    if (!passwordMatch) throw new Error('Invalid password');

    const tokens = signTokens(user.id, user.role);
    await AuthService.storeRefreshToken(tokens.refreshToken, user.id);

    return { user: { id: user.id, email: user.email, role: user.role }, ...tokens };
  }

  /**
   * Valide, révoque et renouvelle un refresh token.
   * Retourne les nouveaux tokens ou null si invalide.
   */
  static async rotateRefreshToken(rawToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: string;
  } | null> {
    const payload = verifyRefreshToken(rawToken);
    if (!payload) return null;

    const record = await prisma.refreshToken.findUnique({
      where: { token: rawToken },
    });

    if (!record || record.revokedAt !== null || record.expiresAt < new Date()) {
      return null;
    }

    // Révocation de l'ancien token
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const tokens = signTokens(payload.userId, payload.role);
    await AuthService.storeRefreshToken(tokens.refreshToken, payload.userId);

    return { ...tokens, userId: payload.userId, role: payload.role };
  }

  /**
   * Révoque un refresh token (logout).
   */
  static async revokeRefreshToken(rawToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: rawToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * @deprecated Utilisé uniquement pour compatibilité interne.
   */
  static async refreshTokens(userId: string, role: string) {
    const tokens = signTokens(userId, role);
    await AuthService.storeRefreshToken(tokens.refreshToken, userId);
    return tokens;
  }

  private static async storeRefreshToken(token: string, userId: string): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
      },
    });
  }

  /**
   * Révoque tous les refresh tokens d'un utilisateur (logout multi-device).
   */
  static async revokeAllRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  /**
   * Liste les sessions actives (tokens non révoqués et non expirés) d'un utilisateur.
   */
  static async listActiveSessions(userId: string): Promise<Array<{
    id: string;
    createdAt: Date;
    expiresAt: Date;
  }>> {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
