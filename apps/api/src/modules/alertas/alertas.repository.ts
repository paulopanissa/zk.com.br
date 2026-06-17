import { Injectable } from '@nestjs/common';
import { AlertEvent, AlertRule, AlertType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AlertasRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Regras ──────────────────────────────────────────────────────────────────

  createRule(data: Prisma.AlertRuleCreateInput): Promise<AlertRule> {
    return this.prisma.alertRule.create({ data });
  }

  findAllRules(unitId: string, filters: { type?: AlertType; active?: boolean }) {
    const where: Prisma.AlertRuleWhereInput = { unidade_id: unitId };
    if (filters.type !== undefined) where.type = filters.type;
    if (filters.active !== undefined) where.active = filters.active;

    return this.prisma.alertRule.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });
  }

  findRuleById(id: string, unitId: string): Promise<AlertRule | null> {
    return this.prisma.alertRule.findFirst({ where: { id, unidade_id: unitId } });
  }

  updateRule(id: string, unitId: string, data: Prisma.AlertRuleUpdateInput): Promise<AlertRule> {
    return this.prisma.alertRule.update({ where: { id, unidade_id: unitId }, data });
  }

  deleteRule(id: string, unitId: string): Promise<AlertRule> {
    return this.prisma.alertRule.delete({ where: { id, unidade_id: unitId } });
  }

  /**
   * Busca regras ativas de um tipo específico para a unidade.
   * Retorna tanto regras globais (product_id IS NULL) quanto regras específicas do produto,
   * quando productId for fornecido.
   */
  findActiveRulesByType(unitId: string, type: AlertType, productId?: string): Promise<AlertRule[]> {
    return this.prisma.alertRule.findMany({
      where: {
        unidade_id: unitId,
        type,
        active: true,
        OR: [
          { product_id: null },
          ...(productId ? [{ product_id: productId }] : []),
        ],
      },
    });
  }

  // ─── Eventos ─────────────────────────────────────────────────────────────────

  /** AlertEvent é append-only — nunca atualizar, apenas inserir. */
  createEvent(data: Prisma.AlertEventCreateInput): Promise<AlertEvent> {
    return this.prisma.alertEvent.create({ data });
  }

  async findAllEvents(
    unitId: string,
    filters: {
      type?: AlertType;
      product_id?: string;
      data_inicio?: Date;
      data_fim?: Date;
    },
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.AlertEventWhereInput = { unidade_id: unitId };

    if (filters.type) where.type = filters.type;

    if (filters.product_id) {
      where.context_id = filters.product_id;
      where.context_type = 'product';
    }

    if (filters.data_inicio || filters.data_fim) {
      where.created_at = {};
      if (filters.data_inicio) (where.created_at as Prisma.DateTimeFilter).gte = filters.data_inicio;
      if (filters.data_fim) (where.created_at as Prisma.DateTimeFilter).lte = filters.data_fim;
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.alertEvent.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { created_at: 'desc' },
        include: { rule: { select: { id: true, name: true, type: true } } },
      }),
      this.prisma.alertEvent.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }
}
