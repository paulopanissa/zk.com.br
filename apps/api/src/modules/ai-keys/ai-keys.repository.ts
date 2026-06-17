import { Injectable } from '@nestjs/common';
import { AiApiKey, AiProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AiApiKeyCreateInput): Promise<AiApiKey> {
    return this.prisma.aiApiKey.create({ data });
  }

  findAll(unitId: string, provider?: AiProvider): Promise<AiApiKey[]> {
    return this.prisma.aiApiKey.findMany({
      where: { unidade_id: unitId, ...(provider ? { provider } : {}) },
      orderBy: [{ provider: 'asc' }, { label: 'asc' }],
    });
  }

  findById(id: string, unitId: string): Promise<AiApiKey | null> {
    return this.prisma.aiApiKey.findFirst({ where: { id, unidade_id: unitId } });
  }

  findActiveByProvider(unitId: string, provider: AiProvider): Promise<AiApiKey | null> {
    return this.prisma.aiApiKey.findFirst({
      where: { unidade_id: unitId, provider, active: true },
      orderBy: { created_at: 'asc' },
    });
  }

  update(id: string, unitId: string, data: Prisma.AiApiKeyUpdateInput): Promise<AiApiKey> {
    return this.prisma.aiApiKey.update({ where: { id, unidade_id: unitId }, data });
  }

  delete(id: string, unitId: string): Promise<AiApiKey> {
    return this.prisma.aiApiKey.delete({ where: { id, unidade_id: unitId } });
  }
}
