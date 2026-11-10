import { sha256Hex } from '@readonly/db';
import {
  type AdminUserDetailResponseData,
  type AdminUserListItem,
  API_MESSAGES,
  type ApiSuccessEnvelope,
  type AuthMeResponseData,
  adminUsersQuerySchema,
  type CreateAdminUserResponseData,
  createAdminUserSchema,
  type LoginResponseData,
  loginSchema,
  MAX_ADDRESS_LENGTH,
  MAX_PHONE_NUMBER_LENGTH,
  MAX_TEXT_FIELD_LENGTH,
  type PaginatedResponse,
  type RegisterResponseData,
  type RegisterValidateResponseData,
  registerSchema,
  registerValidateSchema,
  SESSION_DURATION_MS,
  type UpdateUserResponseData,
  type UpdateUserStatusResponseData,
  type UserStatus,
  UUID_REGEX,
} from '@readonly/shared';
import { type ClockPort, SystemClock } from '../../ports/clock';
import {
  createAccountHasActiveLoansError,
  createAccountInactiveError,
  createCannotDeactivateSelfError,
  createConflictError,
  createInvalidCredentialsError,
  createNotFoundError,
  createSessionNotFoundError,
  createUserNotFoundError,
  createValidationError,
  fromZodError,
} from '../../shared/errors';
import type { ActiveGenreProvider } from '../books/books.service';
import type { AuthenticatedUser, AuthRepository } from './auth.repository';

export interface AuthServiceOptions {
  repository: AuthRepository;
  genreProvider?: ActiveGenreProvider;
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

const DEFAULT_GENRE_PROVIDER: ActiveGenreProvider = {
  async listActiveGenres() {
    return [];
  },
  async areAllGenresActive(): Promise<boolean> {
    return true;
  },
};

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
  private readonly genreProvider: ActiveGenreProvider;
  private readonly clock: ClockPort;
  private readonly bcryptSaltRounds: number;

  constructor(options: AuthServiceOptions) {
    this.repository = options.repository;
    this.genreProvider = options.genreProvider ?? DEFAULT_GENRE_PROVIDER;
    this.clock = options.clock ?? new SystemClock();
    this.bcryptSaltRounds = resolveBcryptSaltRounds(options.bcryptSaltRounds);
  }

  getBcryptSaltRounds(): number {
    return this.bcryptSaltRounds;
  }

  async validateRegistrationStep1(
    rawInput: unknown,
  ): Promise<ApiSuccessEnvelope<RegisterValidateResponseData>> {
    const parsed = registerValidateSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw fromZodError(parsed.error);
    }

    const emailTaken = await this.repository.existsByEmail(parsed.data.email);
    if (emailTaken) {
      throw createConflictError(API_MESSAGES.EMAIL_ALREADY_REGISTERED, 'email');
    }

    return {
      data: { step: 2 },
      message: API_MESSAGES.REGISTER_STEP1_VALID,
    };
  }

  async registerMember(
    rawInput: unknown,
  ): Promise<ApiSuccessEnvelope<RegisterResponseData>> {
    const parsed = registerSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw fromZodError(parsed.error);
    }

    const genresValid = await this.genreProvider.areAllGenresActive(
      parsed.data.genres,
    );
    if (!genresValid) {
      throw createValidationError(API_MESSAGES.GENRE_REQUIRED, 'genres');
    }

    const emailTaken = await this.repository.existsByEmail(parsed.data.email);
    if (emailTaken) {
      throw createConflictError(API_MESSAGES.EMAIL_ALREADY_REGISTERED, 'email');
    }

    // SEC-01: Hash password dengan bcrypt di service API sebelum diteruskan ke repository.
    const passwordHash = await Bun.password.hash(parsed.data.password, {
      algorithm: 'bcrypt',
      cost: this.bcryptSaltRounds,
    });

    const created = await this.repository.createMemberWithGenres({
      fullName: parsed.data.full_name,
      email: parsed.data.email,
      passwordHash,
      address: parsed.data.address,
      phoneNumber: parsed.data.phone_number,
      genreIds: parsed.data.genres,
      createdAt: this.clock.utcNow(),
    });

    if (created.status === 'email_conflict') {
      throw createConflictError(API_MESSAGES.EMAIL_ALREADY_REGISTERED, 'email');
    }

    if (created.status === 'invalid_genres') {
      throw createValidationError(API_MESSAGES.GENRE_REQUIRED, 'genres');
    }

    return {
      data: {
        userId: created.userId,
        role: created.role,
      },
      message: API_MESSAGES.REGISTER_SUCCESS,
    };
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

  async listUsers(
    rawQuery: unknown,
  ): Promise<PaginatedResponse<AdminUserListItem>> {
    const parsed = adminUsersQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw fromZodError(parsed.error);
    }

    const { items, total } = await this.repository.listUsers(parsed.data);
    const totalPages = total === 0 ? 0 : Math.ceil(total / parsed.data.limit);

    return {
      data: items,
      pagination: {
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        totalPages,
      },
    };
  }

  async getUserById(
    id: string,
  ): Promise<ApiSuccessEnvelope<AdminUserDetailResponseData>> {
    if (!UUID_REGEX.test(id)) {
      throw createNotFoundError(API_MESSAGES.USER_NOT_FOUND_404);
    }

    const user = await this.repository.findUserById(id);
    if (!user) {
      throw createNotFoundError(API_MESSAGES.USER_NOT_FOUND_404);
    }

    return {
      data: {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        phone_number: user.phoneNumber,
        address: user.role === 'admin' ? null : user.address,
        role: user.role,
        status: user.status,
      },
    };
  }

  async createAdminUser(
    rawInput: unknown,
  ): Promise<ApiSuccessEnvelope<CreateAdminUserResponseData>> {
    const parsed = createAdminUserSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw fromZodError(parsed.error);
    }

    const emailTaken = await this.repository.existsByEmail(parsed.data.email);
    if (emailTaken) {
      throw createConflictError(API_MESSAGES.EMAIL_ALREADY_REGISTERED, 'email');
    }

    const passwordHash = await Bun.password.hash(parsed.data.password, {
      algorithm: 'bcrypt',
      cost: this.bcryptSaltRounds,
    });

    const created = await this.repository.createAdminUser({
      fullName: parsed.data.full_name,
      email: parsed.data.email,
      passwordHash,
      phoneNumber: parsed.data.phone_number,
      createdAt: this.clock.utcNow(),
    });

    if (created.status === 'email_conflict') {
      throw createConflictError(API_MESSAGES.EMAIL_ALREADY_REGISTERED, 'email');
    }

    return {
      data: {
        id: created.user.id,
        full_name: created.user.full_name,
        email: created.user.email,
        phone_number: created.user.phone_number,
        role: 'admin',
        status: 'active',
      },
      message: API_MESSAGES.ADMIN_USER_ADDED,
    };
  }

  async updateUser(
    id: string,
    rawInput: unknown,
  ): Promise<ApiSuccessEnvelope<UpdateUserResponseData>> {
    if (!UUID_REGEX.test(id)) {
      throw createNotFoundError(API_MESSAGES.USER_NOT_FOUND_404);
    }

    const targetUser = await this.repository.findUserById(id);
    if (!targetUser) {
      throw createNotFoundError(API_MESSAGES.USER_NOT_FOUND_404);
    }

    if (
      typeof rawInput !== 'object' ||
      rawInput === null ||
      Array.isArray(rawInput)
    ) {
      throw createValidationError('Permintaan tidak valid.');
    }

    const raw = rawInput as Record<string, unknown>;
    const keys = Object.keys(raw);

    if (targetUser.role === 'admin') {
      const allowedKeys = new Set(['full_name', 'phone_number']);
      const hasDisallowedKeys = keys.some((k) => !allowedKeys.has(k));
      if (hasDisallowedKeys) {
        throw createValidationError('Permintaan tidak valid.');
      }

      if (
        typeof raw.full_name !== 'string' ||
        raw.full_name.trim().length === 0 ||
        raw.full_name.trim().length > MAX_TEXT_FIELD_LENGTH
      ) {
        throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'full_name');
      }

      if (
        typeof raw.phone_number !== 'string' ||
        raw.phone_number.trim().length === 0 ||
        raw.phone_number.trim().length > MAX_PHONE_NUMBER_LENGTH
      ) {
        throw createValidationError(
          API_MESSAGES.FIELD_REQUIRED,
          'phone_number',
        );
      }

      const updated = await this.repository.updateUser(targetUser.id, {
        fullName: raw.full_name.trim(),
        phoneNumber: raw.phone_number.trim(),
      });

      if (!updated) {
        throw createNotFoundError(API_MESSAGES.USER_NOT_FOUND_404);
      }

      return {
        data: {
          id: updated.id,
          full_name: updated.fullName,
          phone_number: updated.phoneNumber,
          address: null,
          role: 'admin',
        },
        message: API_MESSAGES.USER_UPDATED,
      };
    }

    const allowedKeys = new Set(['full_name', 'phone_number', 'address']);
    const hasDisallowedKeys = keys.some((k) => !allowedKeys.has(k));
    if (hasDisallowedKeys) {
      throw createValidationError('Permintaan tidak valid.');
    }

    if (
      typeof raw.full_name !== 'string' ||
      raw.full_name.trim().length === 0 ||
      raw.full_name.trim().length > MAX_TEXT_FIELD_LENGTH
    ) {
      throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'full_name');
    }

    if (
      typeof raw.phone_number !== 'string' ||
      raw.phone_number.trim().length === 0 ||
      raw.phone_number.trim().length > MAX_PHONE_NUMBER_LENGTH
    ) {
      throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'phone_number');
    }

    if (
      typeof raw.address !== 'string' ||
      raw.address.trim().length === 0 ||
      raw.address.trim().length > MAX_ADDRESS_LENGTH
    ) {
      throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'address');
    }

    const updated = await this.repository.updateUser(targetUser.id, {
      fullName: raw.full_name.trim(),
      phoneNumber: raw.phone_number.trim(),
      address: raw.address.trim(),
    });

    if (!updated) {
      throw createNotFoundError(API_MESSAGES.USER_NOT_FOUND_404);
    }

    return {
      data: {
        id: updated.id,
        full_name: updated.fullName,
        phone_number: updated.phoneNumber,
        address: updated.address,
        role: updated.role,
      },
      message: API_MESSAGES.USER_UPDATED,
    };
  }

  async updateUserStatus(
    id: string,
    rawInput: unknown,
    currentAdmin: AuthenticatedUser,
  ): Promise<ApiSuccessEnvelope<UpdateUserStatusResponseData>> {
    if (!UUID_REGEX.test(id)) {
      throw createNotFoundError(API_MESSAGES.USER_NOT_FOUND_404);
    }

    if (
      typeof rawInput !== 'object' ||
      rawInput === null ||
      Array.isArray(rawInput)
    ) {
      throw createValidationError('Permintaan tidak valid.');
    }

    const raw = rawInput as Record<string, unknown>;
    const keys = Object.keys(raw);
    if (keys.length !== 1 || keys[0] !== 'status') {
      throw createValidationError('Permintaan tidak valid.');
    }

    if (raw.status !== 'active' && raw.status !== 'inactive') {
      throw createValidationError('Permintaan tidak valid.', 'status');
    }

    const targetStatus = raw.status as UserStatus;

    const targetUser = await this.repository.findUserById(id);
    if (!targetUser) {
      throw createNotFoundError(API_MESSAGES.USER_NOT_FOUND_404);
    }

    if (targetStatus === 'inactive') {
      if (targetUser.id.toLowerCase() === currentAdmin.id.toLowerCase()) {
        throw createCannotDeactivateSelfError();
      }

      const hasActiveLoans = await this.repository.hasActiveLoans(
        targetUser.id,
      );
      if (hasActiveLoans) {
        throw createAccountHasActiveLoansError();
      }
    }

    const updated = await this.repository.updateUserStatus(
      targetUser.id,
      targetStatus,
    );
    if (!updated) {
      throw createNotFoundError(API_MESSAGES.USER_NOT_FOUND_404);
    }

    return {
      data: {
        id: updated.id,
        status: updated.status,
      },
      message:
        targetStatus === 'inactive'
          ? API_MESSAGES.ACCOUNT_DEACTIVATED
          : API_MESSAGES.ACCOUNT_ACTIVATED,
    };
  }
}
