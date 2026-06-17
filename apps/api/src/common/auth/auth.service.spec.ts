import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SystemRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn().mockResolvedValue('hashed') }));
jest.mock('crypto', () => ({ randomUUID: jest.fn().mockReturnValue('test-jti') }));

const mockPrisma = {
  systemUser: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwt = { signAsync: jest.fn().mockResolvedValue('token'), verify: jest.fn() };
const mockRedis = { set: jest.fn(), get: jest.fn(), del: jest.fn(), exists: jest.fn() };
const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('secret'),
  get: jest.fn().mockImplementation((_k: string, d?: string) => d ?? '900'),
};

const baseUser = {
  id: 'user-1',
  email: 'admin@test.com',
  password_hash: 'hashed',
  name: 'Admin',
  role: SystemRole.ADMINISTRADOR,
  unidade_id: null,
  is_active: true,
  last_login_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

let service: AuthService;

beforeEach(() => {
  jest.clearAllMocks();
  service = new AuthService(
    mockPrisma as unknown as PrismaService,
    mockJwt as unknown as JwtService,
    mockRedis as unknown as RedisService,
    mockConfig as unknown as ConfigService,
  );
});

describe('login', () => {
  it('returns tokens on valid credentials', async () => {
    mockPrisma.systemUser.findUnique.mockResolvedValue(baseUser);
    mockPrisma.systemUser.update.mockResolvedValue(baseUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({ email: baseUser.email, password: 'pass' });

    expect(result.access_token).toBeDefined();
    expect(result.refresh_token).toBeDefined();
    expect(result.token_type).toBe('Bearer');
  });

  it('throws same 401 for wrong password (no enumeration)', async () => {
    mockPrisma.systemUser.findUnique.mockResolvedValue(baseUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ email: baseUser.email, password: 'wrong' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws same 401 for unknown email (no enumeration)', async () => {
    mockPrisma.systemUser.findUnique.mockResolvedValue(null);

    await expect(service.login({ email: 'ghost@test.com', password: 'pass' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws 401 for inactive user', async () => {
    mockPrisma.systemUser.findUnique.mockResolvedValue({ ...baseUser, is_active: false });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(service.login({ email: baseUser.email, password: 'pass' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('refresh', () => {
  const refreshPayload = { sub: 'user-1', realm: 'system' as const, jti: 'test-jti' };

  it('rotates token and returns new pair', async () => {
    mockJwt.verify.mockReturnValue(refreshPayload);
    mockRedis.get.mockResolvedValue('user-1');
    mockPrisma.systemUser.findUnique.mockResolvedValue(baseUser);

    const result = await service.refresh('valid-token');

    expect(result.access_token).toBeDefined();
    expect(mockRedis.del).toHaveBeenCalledWith('refresh:test-jti');
  });

  it('throws on already-rotated (revoked) token — REALM ISOLATION', async () => {
    mockJwt.verify.mockReturnValue(refreshPayload);
    mockRedis.get.mockResolvedValue(null);

    await expect(service.refresh('used-token')).rejects.toThrow();
  });

  it('rejects ecommerce realm token in system endpoint — REALM ISOLATION', async () => {
    mockJwt.verify.mockReturnValue({ ...refreshPayload, realm: 'ecommerce' });

    await expect(service.refresh('ecom-token')).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 on malformed JWT', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(service.refresh('bad')).rejects.toThrow(UnauthorizedException);
  });
});

describe('createUser', () => {
  it('throws ConflictException on duplicate email', async () => {
    mockPrisma.systemUser.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createUser({
        name: 'Test',
        email: 'existing@test.com',
        password: 'pass1234',
        role: SystemRole.OPERADOR_PDV,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('never returns password_hash in response', async () => {
    mockPrisma.systemUser.findUnique.mockResolvedValue(null);
    mockPrisma.systemUser.create.mockResolvedValue({ ...baseUser, password_hash: 'hash' });

    const result = await service.createUser({
      name: 'Test',
      email: 'new@test.com',
      password: 'pass1234',
      role: SystemRole.OPERADOR_PDV,
    });

    expect(result).not.toHaveProperty('password_hash');
  });
});
