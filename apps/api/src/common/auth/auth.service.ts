import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SystemRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateSystemUserDto } from './dto/create-system-user.dto';
import { SystemLoginDto } from './dto/login.dto';
import { UpdateSystemUserDto } from './dto/update-system-user.dto';
import { JwtSystemPayload, JwtSystemRefreshPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  private readonly REFRESH_PREFIX = 'refresh:';
  private readonly refreshTtl: number;
  private readonly accessTtl: number;
  private readonly systemSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.systemSecret = this.config.getOrThrow<string>('JWT_SYSTEM_SECRET');
    this.accessTtl = Number(this.config.get('JWT_ACCESS_TTL', '900'));
    this.refreshTtl = Number(this.config.get('JWT_REFRESH_TTL', '604800'));
  }

  async login(dto: SystemLoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.systemUser.findUnique({ where: { email: dto.email } });

    const valid =
      user?.is_active === true && (await bcrypt.compare(dto.password, user.password_hash));

    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.prisma.systemUser.update({
      where: { id: user!.id },
      data: { last_login_at: new Date() },
    });

    return this.issueTokens(user!.id, user!.role, user!.unidade_id);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: JwtSystemRefreshPayload;

    try {
      payload = this.jwt.verify<JwtSystemRefreshPayload>(refreshToken, {
        secret: this.systemSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (payload.realm !== 'system') {
      throw new UnauthorizedException('Token inválido para este realm');
    }

    const key = this.REFRESH_PREFIX + payload.jti;
    const userId = await this.redis.get(key);

    if (!userId) {
      // Not found: expired or reuse attempt — treat as security violation
      throw new ForbiddenException('Refresh token inválido — faça login novamente');
    }

    // Rotate: delete before issuing new to prevent race-condition reuse
    await this.redis.del(key);

    const user = await this.prisma.systemUser.findUnique({ where: { id: userId } });
    if (!user?.is_active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    return this.issueTokens(user.id, user.role, user.unidade_id);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwt.verify<JwtSystemRefreshPayload>(refreshToken, {
        secret: this.systemSecret,
        ignoreExpiration: true,
      });

      if (payload.jti) {
        await this.redis.del(this.REFRESH_PREFIX + payload.jti);
      }
    } catch {
      // Silently ignore malformed tokens on logout
    }
  }

  async me(userId: string) {
    const user = await this.prisma.systemUser.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unidade_id: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });
    return user;
  }

  async createUser(dto: CreateSystemUserDto) {
    const exists = await this.prisma.systemUser.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const hash = await bcrypt.hash(dto.password, 12);

    const { password_hash: _, ...user } = await this.prisma.systemUser.create({
      data: {
        name: dto.name,
        email: dto.email,
        password_hash: hash,
        role: dto.role,
        unidade_id: dto.unidade_id ?? null,
      },
    });

    return user;
  }

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.systemUser.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          unidade_id: true,
          is_active: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.systemUser.count(),
    ]);

    return { data, total, page, limit };
  }

  async updateUser(id: string, dto: UpdateSystemUserDto) {
    await this.findUserOrFail(id);

    const { password_hash: _, ...user } = await this.prisma.systemUser.update({
      where: { id },
      data: dto,
    });

    return user;
  }

  async changePassword(id: string, dto: ChangePasswordDto, requesterId: string): Promise<void> {
    const user = await this.findUserOrFail(id);
    const isOwner = id === requesterId;

    if (isOwner) {
      const match = await bcrypt.compare(dto.current_password, user.password_hash);
      if (!match) throw new UnauthorizedException('Senha atual incorreta');
    } else {
      const requester = await this.findUserOrFail(requesterId);
      if (requester.role !== SystemRole.ADMINISTRADOR) {
        throw new ForbiddenException('Sem permissão para alterar senha de outro usuário');
      }
    }

    const hash = await bcrypt.hash(dto.new_password, 12);
    await this.prisma.systemUser.update({ where: { id }, data: { password_hash: hash } });
  }

  async deactivateUser(id: string): Promise<void> {
    await this.findUserOrFail(id);
    await this.prisma.systemUser.update({ where: { id }, data: { is_active: false } });
  }

  private async findUserOrFail(id: string) {
    const user = await this.prisma.systemUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  private async issueTokens(
    userId: string,
    role: SystemRole,
    unidadeId: string | null,
  ): Promise<AuthResponseDto> {
    const accessPayload: JwtSystemPayload = {
      sub: userId,
      realm: 'system',
      role,
      unidade_id: unidadeId,
    };

    const jti = randomUUID();
    const refreshPayload: JwtSystemRefreshPayload = {
      sub: userId,
      realm: 'system',
      jti,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.systemSecret,
        expiresIn: this.accessTtl,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.systemSecret,
        expiresIn: this.refreshTtl,
      }),
    ]);

    await this.redis.set(this.REFRESH_PREFIX + jti, userId, this.refreshTtl);

    return { access_token, refresh_token, token_type: 'Bearer' };
  }
}
