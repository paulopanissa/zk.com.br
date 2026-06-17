import { Injectable } from '@nestjs/common';
import { Delivery, DeliveryConfig, DeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EntregasRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── DeliveryConfig ──────────────────────────────────────────────────────────

  createConfig(data: Prisma.DeliveryConfigCreateInput): Promise<DeliveryConfig> {
    return this.prisma.deliveryConfig.create({ data });
  }

  findConfigByUnitId(unitId: string): Promise<DeliveryConfig | null> {
    return this.prisma.deliveryConfig.findUnique({
      where: { unidade_id: unitId },
    });
  }

  updateConfig(
    unitId: string,
    data: Prisma.DeliveryConfigUpdateInput,
  ): Promise<DeliveryConfig> {
    return this.prisma.deliveryConfig.update({
      where: { unidade_id: unitId },
      data,
    });
  }

  // ─── Delivery ────────────────────────────────────────────────────────────────

  createDelivery(data: Prisma.DeliveryCreateInput): Promise<Delivery> {
    return this.prisma.delivery.create({ data });
  }

  findDeliveryById(id: string, unitId: string): Promise<Delivery | null> {
    return this.prisma.delivery.findFirst({
      where: { id, unidade_id: unitId },
    });
  }

  findDeliveryByVendaId(vendaId: string): Promise<Delivery | null> {
    return this.prisma.delivery.findUnique({
      where: { venda_id: vendaId },
    });
  }

  findDeliveryByUberDeliveryId(uberDeliveryId: string, unitId: string): Promise<Delivery | null> {
    return this.prisma.delivery.findFirst({
      where: { uber_delivery_id: uberDeliveryId, unidade_id: unitId },
    });
  }

  updateDelivery(id: string, data: Prisma.DeliveryUpdateInput): Promise<Delivery> {
    return this.prisma.delivery.update({ where: { id }, data });
  }

  async findAllDeliveries(
    unitId: string,
    filters: { status?: DeliveryStatus },
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.DeliveryWhereInput = { unidade_id: unitId };
    if (filters.status !== undefined) where.status = filters.status;

    const skip = (pagination.page - 1) * pagination.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          venda_id: true,
          provider: true,
          status: true,
          uber_delivery_id: true,
          tracking_url: true,
          fee_centavos: true,
          recipient_name: true,
          dropoff_address: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }
}
