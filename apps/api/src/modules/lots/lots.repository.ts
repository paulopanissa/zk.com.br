import { Injectable } from '@nestjs/common';
import { Lot, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type LotRecord = Lot;

export type LotWithProduct = Lot & {
  product: { id: string; name: string; sku: string | null };
  invoice_item: {
    id: string;
    nf_entrada: { id: string; numero: string; serie: string | null };
  } | null;
};

const PRODUCT_SELECT = {
  product: { select: { id: true, name: true, sku: true } },
  invoice_item: {
    select: {
      id: true,
      nf_entrada: { select: { id: true, numero: true, serie: true } },
    },
  },
} as const;

@Injectable()
export class LotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    unitId: string,
    filters: {
      product_id?: string;
      expires_before?: string;
      expires_after?: string;
      active?: boolean;
      tags?: string[];
      code?: string;
    },
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.LotWhereInput = { unidade_id: unitId };

    if (filters.product_id !== undefined) where.product_id = filters.product_id;
    if (filters.active !== undefined) where.active = filters.active;
    if (filters.code) where.code = { contains: filters.code, mode: 'insensitive' };

    if (filters.expires_before || filters.expires_after) {
      where.expires_at = {};
      if (filters.expires_before) {
        (where.expires_at as Prisma.DateTimeNullableFilter).lte = new Date(filters.expires_before);
      }
      if (filters.expires_after) {
        (where.expires_at as Prisma.DateTimeNullableFilter).gte = new Date(filters.expires_after);
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lot.findMany({
        where,
        include: PRODUCT_SELECT,
        skip,
        take: pagination.limit,
        orderBy: [{ created_at: 'desc' }],
      }),
      this.prisma.lot.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  findById(id: string, unitId: string): Promise<LotRecord | null> {
    return this.prisma.lot.findFirst({
      where: { id, unidade_id: unitId },
    });
  }

  findByProductAndCode(productId: string, code: string, unitId: string): Promise<LotRecord | null> {
    return this.prisma.lot.findUnique({
      where: {
        unidade_id_product_id_code: { unidade_id: unitId, product_id: productId, code },
      },
    });
  }

  async findByProduct(
    productId: string,
    unitId: string,
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.LotWhereInput = { unidade_id: unitId, product_id: productId };
    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      // FIFO: expires_at ASC (nulls last via Prisma nulls), then created_at ASC
      this.prisma.lot.findMany({
        where,
        include: PRODUCT_SELECT,
        skip,
        take: pagination.limit,
        orderBy: [{ expires_at: { sort: 'asc', nulls: 'last' } }, { created_at: 'asc' }],
      }),
      this.prisma.lot.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  async findExpiring(
    unitId: string,
    days: number,
    pagination: { page: number; limit: number },
  ) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const now = new Date();
    const where: Prisma.LotWhereInput = {
      unidade_id: unitId,
      active: true,
      expires_at: {
        not: null,
        gte: now,
        lte: cutoff,
      },
    };

    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lot.findMany({
        where,
        include: PRODUCT_SELECT,
        skip,
        take: pagination.limit,
        orderBy: [{ expires_at: 'asc' }],
      }),
      this.prisma.lot.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  create(data: Prisma.LotCreateInput): Promise<LotRecord> {
    return this.prisma.lot.create({ data });
  }

  update(id: string, unitId: string, data: Prisma.LotUpdateInput): Promise<LotRecord> {
    return this.prisma.lot.update({
      where: { id, unidade_id: unitId } as Prisma.LotWhereUniqueInput,
      data,
    });
  }

  deactivate(id: string, unitId: string): Promise<LotRecord> {
    return this.prisma.lot.update({
      where: { id, unidade_id: unitId } as Prisma.LotWhereUniqueInput,
      data: { active: false },
    });
  }

  /**
   * Retorna o saldo disponível do lote derivado das movimentações de estoque.
   * Implementado após módulo 5 (Estoque): SUM(quantity) de stock_movements para o lote.
   */
  async getBalance(lotId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(quantity), 0)::text AS total
      FROM stock_movements
      WHERE lot_id = ${lotId}
    `;
    return parseFloat(result[0]?.total ?? '0');
  }
}
