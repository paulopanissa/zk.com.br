import { Injectable } from '@nestjs/common';
import { AiContentGeneration, AiGenerationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiIntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AiContentGenerationCreateInput): Promise<AiContentGeneration> {
    return this.prisma.aiContentGeneration.create({ data });
  }

  findByProduct(unitId: string, productId: string): Promise<AiContentGeneration[]> {
    return this.prisma.aiContentGeneration.findMany({
      where: { unidade_id: unitId, product_id: productId },
      orderBy: { created_at: 'desc' },
    });
  }

  findById(id: string, unitId: string): Promise<AiContentGeneration | null> {
    return this.prisma.aiContentGeneration.findFirst({ where: { id, unidade_id: unitId } });
  }

  findByJobId(jobId: string): Promise<AiContentGeneration | null> {
    return this.prisma.aiContentGeneration.findFirst({ where: { job_id: jobId } });
  }

  update(
    id: string,
    data: Prisma.AiContentGenerationUpdateInput,
  ): Promise<AiContentGeneration> {
    return this.prisma.aiContentGeneration.update({ where: { id }, data });
  }

  findPendingByUnit(unitId: string): Promise<AiContentGeneration[]> {
    return this.prisma.aiContentGeneration.findMany({
      where: { unidade_id: unitId, status: AiGenerationStatus.PENDING },
      orderBy: { created_at: 'asc' },
      take: 20,
    });
  }
}
