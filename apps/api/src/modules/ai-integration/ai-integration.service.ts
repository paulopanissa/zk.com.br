import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { AiContentGeneration, AiContentType, AiGenerationStatus, AiProvider } from '@prisma/client';
import { Queue } from 'bullmq';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_CONTENT_QUEUE, AiContentJob } from './ai-content.processor';
import { AiIntegrationRepository } from './ai-integration.repository';
import { GenerateContentDto } from './dto/generate-content.dto';

@Injectable()
export class AiIntegrationService {
  constructor(
    private readonly repository: AiIntegrationRepository,
    private readonly tenancy: TenancyService,
    private readonly prisma: PrismaService,
    @InjectQueue(AI_CONTENT_QUEUE) private readonly queue: Queue<AiContentJob>,
  ) {}

  async requestGeneration(
    dto: GenerateContentDto,
    user: JwtSystemPayload,
  ): Promise<{ generation_id: string; status: AiGenerationStatus }> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.product_id, unidade_id: unitId },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const inFlight = await this.prisma.aiContentGeneration.findFirst({
      where: { unidade_id: unitId, product_id: dto.product_id, status: { in: [AiGenerationStatus.PENDING, AiGenerationStatus.PROCESSING] } },
    });
    if (inFlight) throw new ConflictException('Já existe uma geração em andamento para este produto');

    // Pick first OPENAI key if provider not specified
    const provider = dto.provider ?? AiProvider.OPENAI;

    const generation = await this.repository.create({
      provider,
      types: dto.types,
      status: AiGenerationStatus.PENDING,
      unit: { connect: { id: unitId } },
      product: { connect: { id: dto.product_id } },
    });

    const job = await this.queue.add(
      'generate',
      { generationId: generation.id, unitId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 200 },
    );

    await this.repository.update(generation.id, { job_id: job.id ?? null });

    return { generation_id: generation.id, status: AiGenerationStatus.PENDING };
  }

  async findByProduct(productId: string, user: JwtSystemPayload): Promise<AiContentGeneration[]> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, unidade_id: unitId },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return this.repository.findByProduct(unitId, productId);
  }

  async findOne(id: string, user: JwtSystemPayload): Promise<AiContentGeneration> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const gen = await this.repository.findById(id, unitId);
    if (!gen) throw new NotFoundException('Geração não encontrada');
    return gen;
  }

  async applyGeneration(id: string, user: JwtSystemPayload): Promise<{ applied: boolean }> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const gen = await this.repository.findById(id, unitId);
    if (!gen) throw new NotFoundException('Geração não encontrada');
    if (gen.status !== AiGenerationStatus.DONE) {
      throw new BadRequestException(`Geração ainda não concluída (status: ${gen.status})`);
    }
    if (gen.applied_at) {
      throw new BadRequestException('Geração já foi aplicada');
    }

    const generated = gen.generated as Record<string, unknown> | null;
    if (!generated) throw new BadRequestException('Conteúdo gerado está vazio');

    const productUpdate: Record<string, unknown> = {};
    if (generated.description) productUpdate.description = generated.description;
    if (generated.short_description) productUpdate.short_description = generated.short_description;

    const seoUpdate: Record<string, unknown> = {};
    if (generated.seo_title) seoUpdate.seo_title = generated.seo_title;
    if (generated.seo_description) seoUpdate.seo_description = generated.seo_description;
    if (Array.isArray(generated.seo_keywords)) seoUpdate.seo_keywords = generated.seo_keywords;
    if (generated.schema_org_json) {
      seoUpdate.schema_org_json = generated.schema_org_json;
      seoUpdate.schema_org_generated_at = new Date();
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(productUpdate).length > 0) {
        await tx.product.update({ where: { id: gen.product_id, unidade_id: gen.unidade_id }, data: productUpdate });
      }
      if (Object.keys(seoUpdate).length > 0) {
        await tx.productSeo.upsert({
          where: { product_id: gen.product_id },
          create: { product_id: gen.product_id, ...seoUpdate },
          update: seoUpdate,
        });
      }
      await tx.aiContentGeneration.update({ where: { id, unidade_id: gen.unidade_id }, data: { applied_at: new Date() } });
    });

    return { applied: true };
  }
}
