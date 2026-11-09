import {
  API_MESSAGES,
  type ApiSuccessEnvelope,
  type RegisterResponseData,
  type RegisterValidateResponseData,
  registerSchema,
  registerValidateSchema,
} from '@readonly/shared';
import { type ClockPort, SystemClock } from '../../ports/clock';
import {
  createConflictError,
  createValidationError,
  fromZodError,
} from '../../shared/errors';
import type { ActiveGenreProvider } from '../books/books.service';
import type { AuthRepository } from './auth.repository';

export interface AuthServiceOptions {
  repository: AuthRepository;
  genreProvider: ActiveGenreProvider;
  clock?: ClockPort;
  bcryptSaltRounds?: number;
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

export class AuthService {
  private readonly repository: AuthRepository;
  private readonly genreProvider: ActiveGenreProvider;
  private readonly clock: ClockPort;
  private readonly bcryptSaltRounds: number;

  constructor(options: AuthServiceOptions) {
    this.repository = options.repository;
    this.genreProvider = options.genreProvider;
    this.clock = options.clock ?? new SystemClock();
    this.bcryptSaltRounds = resolveBcryptSaltRounds(options.bcryptSaltRounds);
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
}
