import { UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { LoginInput, RegisterInput } from '../schemas/auth.schema';
import { SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import { createAccessToken } from '../utils/jwt';
import { env } from '../utils/env';

const sanitizeUser = <T extends { passwordHash?: string; role: UserRole }>(user: T): SanitizedUser => {
  const { passwordHash: _passwordHash, role, ...rest } = user;
  return {
    ...(rest as unknown as SanitizedUser),
    role,
    roles: (rest as Record<string, any>).roles ?? [role],
    schoolCode: (rest as Record<string, any>).schoolCode ?? null,
  };
};

const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');

const buildAuthResponse = (user: SanitizedUser, refreshToken: string, refreshTokenExpiresAt: Date) => {
  const { token, expiresAt } = createAccessToken({
    userId: user.id,
    roles: user.roles ?? [user.role],
  });

  return {
    accessToken: token,
    accessTokenExpiresAt: expiresAt,
    refreshToken,
    refreshTokenExpiresAt,
    user,
  };
};

const issueSession = async (user: SanitizedUser) => {
  const refreshToken = randomBytes(48).toString('base64url');
  const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshSession.create({
    data: { userId: user.id, tokenHash: hashRefreshToken(refreshToken), expiresAt: refreshTokenExpiresAt },
  });
  return buildAuthResponse(user, refreshToken, refreshTokenExpiresAt);
};

export const authService = {
  register: async (input: RegisterInput) => {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new HttpError(409, 'A user with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        schoolCode: input.schoolCode ?? null,
        passwordHash,
        role: UserRole.STUDENT,
      },
    });

    const sanitized = sanitizeUser(user);

    return issueSession(sanitized);
  },

  login: async (input: LoginInput) => {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const matches = await comparePassword(input.password, user.passwordHash);
    if (!matches) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const sanitized = sanitizeUser(user);

    return issueSession(sanitized);
  },

  refreshSession: async (refreshToken: string | undefined) => {
    if (!refreshToken) throw new HttpError(401, 'Refresh session is missing');
    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken) },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt <= now) {
      throw new HttpError(401, 'Refresh session is invalid or expired');
    }

    const user = await authService.getProfile(session.userId);
    const nextRefreshToken = randomBytes(48).toString('base64url');
    const nextRefreshTokenExpiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const access = createAccessToken({ userId: user.id, roles: user.roles ?? [user.role] });

    await prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshSession.updateMany({
        where: { id: session.id, tokenHash: hashRefreshToken(refreshToken), revokedAt: null, expiresAt: { gt: now } },
        data: {
          tokenHash: hashRefreshToken(nextRefreshToken),
          expiresAt: nextRefreshTokenExpiresAt,
        },
      });
      if (revoked.count !== 1) throw new HttpError(401, 'Refresh session has already been used');
    });

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt: nextRefreshTokenExpiresAt,
      user,
    };
  },

  logout: async (refreshToken?: string) => {
    if (!refreshToken) return;
    await prisma.refreshSession.updateMany({
      where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  getProfile: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    return sanitizeUser(user);
  },
};
