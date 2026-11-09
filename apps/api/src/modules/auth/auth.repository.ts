import { randomUUID } from 'node:crypto';
import { type Database, QA_IDS, sessions, users } from '@readonly/db';
import type { UserRole, UserStatus } from '@readonly/shared';
import { and, eq, gt, sql } from 'drizzle-orm';

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

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  findActiveSessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<AuthenticatedUser | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<boolean>;
}

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: Database) {}

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

export interface InMemorySessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

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
  private readonly sessions: InMemorySessionRecord[] = [];

  constructor(initialUsers?: InMemoryUserRecord[]) {
    this.users = (initialUsers ?? createDefaultInMemoryUsers()).map((user) => ({
      ...user,
    }));
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

  getUsers(): readonly InMemoryUserRecord[] {
    return this.users;
  }

  getSessions(): readonly InMemorySessionRecord[] {
    return this.sessions;
  }
}
