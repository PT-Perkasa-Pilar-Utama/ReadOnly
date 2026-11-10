import { randomUUID } from 'node:crypto';
import {
  type Database,
  genres,
  loans,
  QA_IDS,
  sessions,
  userGenres,
  users,
} from '@readonly/db';
import type {
  AdminUserListItem,
  AdminUsersQuery,
  LoanStatus,
  UserRole,
  UserStatus,
} from '@readonly/shared';
import { and, desc, eq, gt, ilike, inArray, ne, or, sql } from 'drizzle-orm';

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

export interface AuthUserRecord {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface UserDetailRecord {
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

export interface CreateAdminUserInputInternal {
  fullName: string;
  email: string;
  passwordHash: string;
  phoneNumber: string;
  createdAt: Date;
}

export type CreateAdminUserResult =
  | {
      status: 'created';
      user: AdminUserListItem;
    }
  | {
      status: 'email_conflict';
    };

export interface UpdateUserData {
  fullName: string;
  phoneNumber: string;
  address?: string | null;
}

export interface AuthRepository {
  existsByEmail(email: string): Promise<boolean>;
  createMemberWithGenres(input: CreateMemberInput): Promise<CreateMemberResult>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  findActiveSessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<AuthenticatedUser | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<boolean>;
  listUsers(
    params: AdminUsersQuery,
  ): Promise<{ items: AdminUserListItem[]; total: number }>;
  findUserById(id: string): Promise<UserDetailRecord | null>;
  createAdminUser(
    input: CreateAdminUserInputInternal,
  ): Promise<CreateAdminUserResult>;
  updateUser(
    id: string,
    data: UpdateUserData,
  ): Promise<UserDetailRecord | null>;
  hasActiveLoans(userId: string): Promise<boolean>;
  updateUserStatus(
    id: string,
    status: UserStatus,
  ): Promise<UserDetailRecord | null>;
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

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const [row] = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    return row ?? null;
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.db.insert(sessions).values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: input.createdAt,
    });
  }

  async findActiveSessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<AuthenticatedUser | null> {
    const [row] = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)),
      )
      .limit(1);

    return row ?? null;
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<boolean> {
    const deleted = await this.db
      .delete(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .returning({ id: sessions.id });

    return deleted.length > 0;
  }

  async listUsers(
    params: AdminUsersQuery,
  ): Promise<{ items: AdminUserListItem[]; total: number }> {
    const conditions = [];

    if (params.q && params.q.trim().length > 0) {
      const pattern = `%${params.q.trim()}%`;
      const searchCondition = or(
        ilike(users.fullName, pattern),
        ilike(users.email, pattern),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (params.role) {
      conditions.push(eq(users.role, params.role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    const total = Number(count);
    if (total === 0) {
      return { items: [], total: 0 };
    }

    const rows = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    const items: AdminUserListItem[] = rows.map((r) => ({
      id: r.id,
      full_name: r.fullName,
      email: r.email,
      phone_number: r.phoneNumber,
      role: r.role,
      status: r.status,
    }));

    return { items, total };
  }

  async findUserById(id: string): Promise<UserDetailRecord | null> {
    const [row] = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        passwordHash: users.passwordHash,
        address: users.address,
        phoneNumber: users.phoneNumber,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return row ?? null;
  }

  async createAdminUser(
    input: CreateAdminUserInputInternal,
  ): Promise<CreateAdminUserResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    try {
      return await this.db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${normalizedEmail}`)
          .limit(1);

        if (existing.length > 0) {
          return { status: 'email_conflict' } as const;
        }

        const [created] = await tx
          .insert(users)
          .values({
            fullName: input.fullName,
            email: normalizedEmail,
            passwordHash: input.passwordHash,
            phoneNumber: input.phoneNumber,
            address: null,
            role: 'admin',
            status: 'active',
            createdAt: input.createdAt,
          })
          .returning({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            phoneNumber: users.phoneNumber,
            role: users.role,
            status: users.status,
          });

        if (!created) {
          throw new Error('Failed to insert admin user row.');
        }

        return {
          status: 'created' as const,
          user: {
            id: created.id,
            full_name: created.fullName,
            email: created.email,
            phone_number: created.phoneNumber,
            role: created.role,
            status: created.status,
          },
        };
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        return { status: 'email_conflict' };
      }
      throw error;
    }
  }

  async updateUser(
    id: string,
    data: UpdateUserData,
  ): Promise<UserDetailRecord | null> {
    const [updated] = await this.db
      .update(users)
      .set({
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        ...(data.address !== undefined ? { address: data.address } : {}),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        passwordHash: users.passwordHash,
        address: users.address,
        phoneNumber: users.phoneNumber,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      });

    return updated ?? null;
  }

  async hasActiveLoans(userId: string): Promise<boolean> {
    const activeLoans = await this.db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.userId, userId), ne(loans.status, 'RETURNED')))
      .limit(1);

    return activeLoans.length > 0;
  }

  async updateUserStatus(
    id: string,
    status: UserStatus,
  ): Promise<UserDetailRecord | null> {
    const [updated] = await this.db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        passwordHash: users.passwordHash,
        address: users.address,
        phoneNumber: users.phoneNumber,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      });

    return updated ?? null;
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

export interface InMemorySessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface InMemoryLoanRecord {
  id: string;
  userId: string;
  status: LoanStatus;
}

const DEFAULT_IN_MEMORY_AUTH_LOANS: InMemoryLoanRecord[] = [
  {
    id: QA_IDS.loans.pending,
    userId: QA_IDS.users.member1,
    status: 'PENDING',
  },
];

const HASH_PASSWORD_FIXTURE = Bun.password.hashSync('password', {
  algorithm: 'bcrypt',
  cost: 4,
});

const HASH_PASSWORD123_FIXTURE = Bun.password.hashSync('password123', {
  algorithm: 'bcrypt',
  cost: 4,
});

function createDefaultInMemoryUsers(): InMemoryUserRecord[] {
  const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envAdminPassword = process.env.ADMIN_PASSWORD;

  const baseUsers: InMemoryUserRecord[] = [
    {
      id: QA_IDS.users.admin,
      fullName: 'Admin Perpus',
      email: 'admin@readonly.ppu.co.id',
      passwordHash: HASH_PASSWORD123_FIXTURE,
      address: null,
      phoneNumber: '081100000001',
      role: 'admin',
      status: 'active',
      createdAt: new Date('2026-11-09T00:00:00.000Z'),
    },
    {
      id: QA_IDS.users.member1,
      fullName: 'Member Satu',
      email: 'member1@readonly.ppu.co.id',
      passwordHash: HASH_PASSWORD123_FIXTURE,
      address: 'Jl. Sudirman No. 1, Jakarta',
      phoneNumber: '081200000001',
      role: 'member',
      status: 'active',
      createdAt: new Date('2026-11-09T00:00:00.000Z'),
    },
    {
      id: '00000000-0000-4000-8000-000000000099',
      fullName: 'Member Baru',
      email: 'newmember@gmail.com',
      passwordHash: HASH_PASSWORD_FIXTURE,
      address: 'Jl. Thamrin No. 10, Jakarta',
      phoneNumber: '081200000099',
      role: 'member',
      status: 'active',
      createdAt: new Date('2026-11-09T00:00:00.000Z'),
    },
    {
      id: QA_IDS.users.inactiveMember,
      fullName: 'Member Nonaktif',
      email: 'inactive@readonly.ppu.co.id',
      passwordHash: HASH_PASSWORD123_FIXTURE,
      address: 'Jl. Gatot Subroto No. 3, Jakarta',
      phoneNumber: '081200000003',
      role: 'member',
      status: 'inactive',
      createdAt: new Date('2026-11-09T00:00:00.000Z'),
    },
  ];

  if (
    envAdminEmail &&
    envAdminEmail !== 'admin@readonly.ppu.co.id' &&
    envAdminPassword
  ) {
    baseUsers.push({
      id: '00000000-0000-4000-8000-000000000098',
      fullName: 'Admin Perpus',
      email: envAdminEmail,
      passwordHash: Bun.password.hashSync(envAdminPassword, {
        algorithm: 'bcrypt',
        cost: 4,
      }),
      address: null,
      phoneNumber: '081100000002',
      role: 'admin',
      status: 'active',
      createdAt: new Date('2026-11-09T00:00:00.000Z'),
    });
  }

  return baseUsers;
}

export class InMemoryAuthRepository implements AuthRepository {
  private readonly users: InMemoryUserRecord[];
  private readonly userGenres: InMemoryUserGenreRecord[] = [];
  private readonly sessions: InMemorySessionRecord[] = [];
  private readonly loans: InMemoryLoanRecord[];
  private readonly activeGenreCheck?: (genreIds: string[]) => Promise<boolean>;

  constructor(
    initialUsers?: InMemoryUserRecord[],
    activeGenreCheck?: (genreIds: string[]) => Promise<boolean>,
    initialLoans?: InMemoryLoanRecord[],
  ) {
    this.users = (initialUsers ?? createDefaultInMemoryUsers()).map((user) => ({
      ...user,
    }));
    if (activeGenreCheck !== undefined) {
      this.activeGenreCheck = activeGenreCheck;
    }
    this.loans = (initialLoans ?? DEFAULT_IN_MEMORY_AUTH_LOANS).map((loan) => ({
      ...loan,
    }));
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

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const user = this.users.find(
      (item) => item.email.toLowerCase() === normalized,
    );
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
    };
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    this.sessions.push({
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: input.createdAt,
    });
  }

  async findActiveSessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<AuthenticatedUser | null> {
    const nowMs = now.getTime();
    const session = this.sessions.find(
      (item) =>
        item.tokenHash === tokenHash && item.expiresAt.getTime() > nowMs,
    );
    if (!session) {
      return null;
    }

    const user = this.users.find((item) => item.id === session.userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<boolean> {
    const index = this.sessions.findIndex(
      (item) => item.tokenHash === tokenHash,
    );
    if (index === -1) {
      return false;
    }

    this.sessions.splice(index, 1);
    return true;
  }

  async listUsers(
    params: AdminUsersQuery,
  ): Promise<{ items: AdminUserListItem[]; total: number }> {
    const qNormalized = params.q?.trim().toLowerCase();

    let filtered = this.users.filter((user) => {
      if (qNormalized && qNormalized.length > 0) {
        const matchesName = user.fullName.toLowerCase().includes(qNormalized);
        const matchesEmail = user.email.toLowerCase().includes(qNormalized);
        if (!matchesName && !matchesEmail) {
          return false;
        }
      }

      if (params.role && user.role !== params.role) {
        return false;
      }

      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return b.id.localeCompare(a.id);
    });

    const total = filtered.length;
    const offset = (params.page - 1) * params.limit;
    const paged = filtered.slice(offset, offset + params.limit);

    const items: AdminUserListItem[] = paged.map((u) => ({
      id: u.id,
      full_name: u.fullName,
      email: u.email,
      phone_number: u.phoneNumber,
      role: u.role,
      status: u.status,
    }));

    return { items, total };
  }

  async findUserById(id: string): Promise<UserDetailRecord | null> {
    const normalized = id.toLowerCase();
    const user = this.users.find((u) => u.id.toLowerCase() === normalized);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      passwordHash: user.passwordHash,
      address: user.address,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  async createAdminUser(
    input: CreateAdminUserInputInternal,
  ): Promise<CreateAdminUserResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (await this.existsByEmail(normalizedEmail)) {
      return { status: 'email_conflict' };
    }

    const userId = randomUUID();
    const newUser: InMemoryUserRecord = {
      id: userId,
      fullName: input.fullName,
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      address: null,
      phoneNumber: input.phoneNumber,
      role: 'admin',
      status: 'active',
      createdAt: input.createdAt,
    };

    this.users.push(newUser);

    return {
      status: 'created',
      user: {
        id: newUser.id,
        full_name: newUser.fullName,
        email: newUser.email,
        phone_number: newUser.phoneNumber,
        role: newUser.role,
        status: newUser.status,
      },
    };
  }

  async updateUser(
    id: string,
    data: UpdateUserData,
  ): Promise<UserDetailRecord | null> {
    const normalized = id.toLowerCase();
    const user = this.users.find((u) => u.id.toLowerCase() === normalized);
    if (!user) {
      return null;
    }

    user.fullName = data.fullName;
    user.phoneNumber = data.phoneNumber;
    if (data.address !== undefined) {
      user.address = data.address;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      passwordHash: user.passwordHash,
      address: user.address,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  async hasActiveLoans(userId: string): Promise<boolean> {
    const normalized = userId.toLowerCase();
    return this.loans.some(
      (l) => l.userId.toLowerCase() === normalized && l.status !== 'RETURNED',
    );
  }

  async updateUserStatus(
    id: string,
    status: UserStatus,
  ): Promise<UserDetailRecord | null> {
    const normalized = id.toLowerCase();
    const user = this.users.find((u) => u.id.toLowerCase() === normalized);
    if (!user) {
      return null;
    }

    user.status = status;

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      passwordHash: user.passwordHash,
      address: user.address,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  getLoans(): readonly InMemoryLoanRecord[] {
    return this.loans;
  }

  addLoan(loan: InMemoryLoanRecord): void {
    this.loans.push(loan);
  }

  clearLoans(): void {
    this.loans.length = 0;
  }

  getUsers(): readonly InMemoryUserRecord[] {
    return this.users;
  }

  getUserGenres(): readonly InMemoryUserGenreRecord[] {
    return this.userGenres;
  }

  getSessions(): readonly InMemorySessionRecord[] {
    return this.sessions;
  }
}
