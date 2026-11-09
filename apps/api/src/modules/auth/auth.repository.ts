import { randomUUID } from 'node:crypto';
import { type Database, genres, QA_IDS, userGenres, users } from '@readonly/db';
import type { UserRole, UserStatus } from '@readonly/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';

export interface CreateMemberInput {
  fullName: string;
  email: string;
  passwordHash: string;
  address: string;
  phoneNumber: string;
  genreIds: string[];
  createdAt: Date;
}

export type CreateMemberResult =
  | {
      status: 'created';
      userId: string;
      role: 'member';
    }
  | {
      status: 'email_conflict';
    }
  | {
      status: 'invalid_genres';
    };

export interface AuthRepository {
  existsByEmail(email: string): Promise<boolean>;
  createMemberWithGenres(input: CreateMemberInput): Promise<CreateMemberResult>;
}

function isPostgresUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const record = error as {
    code?: unknown;
    cause?: { code?: unknown };
  };

  return record.code === '23505' || record.cause?.code === '23505';
}

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: Database) {}

  async existsByEmail(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    return rows.length > 0;
  }

  async createMemberWithGenres(
    input: CreateMemberInput,
  ): Promise<CreateMemberResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const uniqueGenreIds = Array.from(
      new Set(input.genreIds.map((id) => id.toLowerCase())),
    );

    if (uniqueGenreIds.length === 0) {
      return { status: 'invalid_genres' };
    }

    try {
      return await this.db.transaction(async (tx) => {
        const existingUser = await tx
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${normalizedEmail}`)
          .limit(1);

        if (existingUser.length > 0) {
          return { status: 'email_conflict' } as const;
        }

        const activeGenres = await tx
          .select({ id: genres.id })
          .from(genres)
          .where(
            and(
              eq(genres.status, 'active'),
              inArray(genres.id, uniqueGenreIds),
            ),
          );

        if (activeGenres.length !== uniqueGenreIds.length) {
          return { status: 'invalid_genres' } as const;
        }

        const [createdUser] = await tx
          .insert(users)
          .values({
            fullName: input.fullName,
            email: normalizedEmail,
            passwordHash: input.passwordHash,
            address: input.address,
            phoneNumber: input.phoneNumber,
            role: 'member',
            status: 'active',
            createdAt: input.createdAt,
          })
          .returning({ id: users.id });

        if (!createdUser) {
          throw new Error('Failed to insert member row.');
        }

        await tx.insert(userGenres).values(
          uniqueGenreIds.map((genreId) => ({
            userId: createdUser.id,
            genreId,
          })),
        );

        return {
          status: 'created' as const,
          userId: createdUser.id,
          role: 'member' as const,
        };
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        return { status: 'email_conflict' };
      }
      throw error;
    }
  }
}

export interface InMemoryUserRecord {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  address: string | null;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

export interface InMemoryUserGenreRecord {
  userId: string;
  genreId: string;
}

const DEFAULT_IN_MEMORY_USERS: InMemoryUserRecord[] = [
  {
    id: QA_IDS.users.member1,
    fullName: 'Member Satu',
    email: 'newmember@gmail.com',
    passwordHash: '$2b$10$seededhashplaceholder00000000000000000000000000000',
    address: 'Jl. Sudirman No. 1, Jakarta',
    phoneNumber: '081200000001',
    role: 'member',
    status: 'active',
    createdAt: new Date('2026-11-09T00:00:00.000Z'),
  },
];

export class InMemoryAuthRepository implements AuthRepository {
  private readonly users: InMemoryUserRecord[];
  private readonly userGenres: InMemoryUserGenreRecord[] = [];
  private readonly activeGenreCheck?: (genreIds: string[]) => Promise<boolean>;

  constructor(
    initialUsers: InMemoryUserRecord[] = DEFAULT_IN_MEMORY_USERS,
    activeGenreCheck?: (genreIds: string[]) => Promise<boolean>,
  ) {
    this.users = initialUsers.map((user) => ({ ...user }));
    if (activeGenreCheck !== undefined) {
      this.activeGenreCheck = activeGenreCheck;
    }
  }

  async existsByEmail(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    return this.users.some((user) => user.email.toLowerCase() === normalized);
  }

  async createMemberWithGenres(
    input: CreateMemberInput,
  ): Promise<CreateMemberResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const uniqueGenreIds = Array.from(
      new Set(input.genreIds.map((id) => id.toLowerCase())),
    );

    if (uniqueGenreIds.length === 0) {
      return { status: 'invalid_genres' };
    }

    if (await this.existsByEmail(normalizedEmail)) {
      return { status: 'email_conflict' };
    }

    if (
      this.activeGenreCheck &&
      !(await this.activeGenreCheck(uniqueGenreIds))
    ) {
      return { status: 'invalid_genres' };
    }

    const userId = randomUUID();
    this.users.push({
      id: userId,
      fullName: input.fullName,
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      address: input.address,
      phoneNumber: input.phoneNumber,
      role: 'member',
      status: 'active',
      createdAt: input.createdAt,
    });

    for (const genreId of uniqueGenreIds) {
      this.userGenres.push({ userId, genreId });
    }

    return {
      status: 'created',
      userId,
      role: 'member',
    };
  }

  getUsers(): readonly InMemoryUserRecord[] {
    return this.users;
  }

  getUserGenres(): readonly InMemoryUserGenreRecord[] {
    return this.userGenres;
  }
}
