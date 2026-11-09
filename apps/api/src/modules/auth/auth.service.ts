import { sha256Hex } from '@readonly/db';
import {
  API_MESSAGES,
  type ApiSuccessEnvelope,
  type AuthMeResponseData,
  type LoginResponseData,
  loginSchema,
  SESSION_DURATION_MS,
} from '@readonly/shared';
import { type ClockPort, SystemClock } from '../../ports/clock';
import {
  createAccountInactiveError,
  createInvalidCredentialsError,
  createSessionNotFoundError,
  createUserNotFoundError,
  fromZodError,
} from '../../shared/errors';
import type { AuthenticatedUser, AuthRepository } from './auth.repository';

export interface AuthServiceOptions {
  repository: AuthRepository;
  clock?: ClockPort;
  bcryptSaltRounds?: number;
}

export interface AuthenticatedSession {
  user: AuthenticatedUser;
  tokenHash: string;
}

export interface LoginResult {
  envelope: ApiSuccessEnvelope<LoginResponseData>;
  sessionToken: string;
}

export function resolveBcryptSaltRounds(override?: number): number {
  if (override !== undefined) {
    if (!Number.isInteger(override) || override < 4 || override > 31) {
      throw new Error('bcryptSaltRounds must be an integer between 4 and 31.');
    }
    return override;
  }

  const envValue = process.env.BCRYPT_SALT_ROUNDS;
  if (envValue !== undefined && envValue.trim().length > 0) {
    const parsed = Number(envValue);
    if (Number.isInteger(parsed) && parsed >= 4 && parsed <= 31) {
      return parsed;
    }
  }

  return 11;
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
}

export class AuthService {
  private readonly repository: AuthRepository;
  private readonly clock: ClockPort;
  private readonly bcryptSaltRounds: number;

  constructor(options: AuthServiceOptions) {
    this.repository = options.repository;
    this.clock = options.clock ?? new SystemClock();
    this.bcryptSaltRounds = resolveBcryptSaltRounds(options.bcryptSaltRounds);
  }

  getBcryptSaltRounds(): number {
    return this.bcryptSaltRounds;
  }

  async login(rawInput: unknown): Promise<LoginResult> {
    const parsed = loginSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw fromZodError(parsed.error);
    }

    const user = await this.repository.findUserByEmail(parsed.data.email);
    if (!user) {
      throw createUserNotFoundError();
    }

    const passwordValid = await Bun.password.verify(
      parsed.data.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw createInvalidCredentialsError();
    }

    if (user.status === 'inactive') {
      throw createAccountInactiveError();
    }

    const sessionToken = generateSessionToken();
    const tokenHash = sha256Hex(sessionToken);
    const createdAt = this.clock.utcNow();
    const expiresAt = new Date(createdAt.getTime() + SESSION_DURATION_MS);

    await this.repository.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt,
    });

    return {
      envelope: {
        data: { token: sessionToken },
        message: API_MESSAGES.LOGIN_SUCCESS,
      },
      sessionToken,
    };
  }

  async authenticateToken(
    rawToken: string | null | undefined,
  ): Promise<AuthenticatedSession> {
    if (typeof rawToken !== 'string' || rawToken.trim().length === 0) {
      throw createSessionNotFoundError();
    }

    const tokenHash = sha256Hex(rawToken.trim());
    const user = await this.repository.findActiveSessionByTokenHash(
      tokenHash,
      this.clock.utcNow(),
    );

    if (!user) {
      throw createSessionNotFoundError();
    }

    return { user, tokenHash };
  }

  getMe(user: AuthenticatedUser): ApiSuccessEnvelope<AuthMeResponseData> {
    return {
      data: {
        id: user.id,
        full_name: user.fullName,
        role: user.role,
        email: user.email,
      },
    };
  }

  async logout(tokenHash: string): Promise<void> {
    const deleted = await this.repository.deleteSessionByTokenHash(tokenHash);
    if (!deleted) {
      throw createSessionNotFoundError();
    }
  }
}
