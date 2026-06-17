import { Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CuponsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return this.prisma.coupon.create({ data });
  }

  async findAll(
    unitId: string,
    filters: { type?: Prisma.EnumCouponTypeFilter | Coupon['type']; active?: boolean },
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.CouponWhereInput = { unidade_id: unitId };
    if (filters.type !== undefined) where.type = filters.type;
    if (filters.active !== undefined) where.active = filters.active;
    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { created_at: 'desc' },
        include: { product: { select: { id: true, name: true, sku: true } } },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  findById(id: string, unitId: string): Promise<Coupon | null> {
    return this.prisma.coupon.findFirst({ where: { id, unidade_id: unitId } });
  }

  findByCode(code: string, unitId: string) {
    return this.prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), unidade_id: unitId },
      include: { product: { select: { id: true, name: true } } },
    });
  }

  update(id: string, unitId: string, data: Prisma.CouponUpdateInput): Promise<Coupon> {
    return this.prisma.coupon.update({ where: { id, unidade_id: unitId }, data });
  }

  delete(id: string, unitId: string): Promise<Coupon> {
    return this.prisma.coupon.delete({ where: { id, unidade_id: unitId } });
  }

  async incrementUsesInTx(
    tx: Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    couponId: string,
    vendaId: string,
  ): Promise<{ success: boolean; alreadyUsed: boolean }> {
    // Idempotência: mesma venda não conta duas vezes
    const existing = await tx.couponUsage.findUnique({
      where: { coupon_id_venda_id: { coupon_id: couponId, venda_id: vendaId } },
      select: { id: true },
    });
    if (existing) return { success: true, alreadyUsed: true };

    // Atomic conditional UPDATE — previne race condition com max_uses
    // Se 0 linhas afetadas, limite já foi atingido por concorrente
    const affected = await tx.$executeRaw`
      UPDATE coupons
      SET uses_count = uses_count + 1
      WHERE id = ${couponId}
        AND active = true
        AND (max_uses IS NULL OR uses_count < max_uses)
    `;
    if (affected === 0) return { success: false, alreadyUsed: false };

    await tx.couponUsage.create({ data: { coupon_id: couponId, venda_id: vendaId } });
    return { success: true, alreadyUsed: false };
  }

  async incrementUses(
    couponId: string,
    vendaId: string,
  ): Promise<{ success: boolean; alreadyUsed: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      return this.incrementUsesInTx(tx as any, couponId, vendaId);
    });
  }
}
