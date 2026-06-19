import { Injectable } from '@nestjs/common';
import { Prisma, Venda, VendaItem, VendaOrigem, VendaPayment, VendaPaymentStatus, VendaStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type VendaFull = Venda & {
  items: (VendaItem & {
    product: { id: string; name: string; sku: string | null; barcode: string | null };
  })[];
  payments: VendaPayment[];
  cliente: { id: string; nome: string; telefone_principal: string; email: string | null } | null;
};

@Injectable()
export class VendasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    unitId: string,
    filters: {
      numero?: number;
      status?: VendaStatus;
      origem?: VendaOrigem;
      cliente_id?: string;
      data_inicio?: Date;
      data_fim?: Date;
    },
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.VendaWhereInput = { unidade_id: unitId };
    if (filters.numero) where.numero = filters.numero;
    if (filters.status) where.status = filters.status;
    if (filters.origem) where.origem = filters.origem;
    if (filters.cliente_id) where.cliente_id = filters.cliente_id;
    if (filters.data_inicio || filters.data_fim) {
      where.created_at = {};
      if (filters.data_inicio) (where.created_at as Prisma.DateTimeFilter).gte = filters.data_inicio;
      if (filters.data_fim) (where.created_at as Prisma.DateTimeFilter).lte = filters.data_fim;
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.venda.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { created_at: 'desc' },
        include: {
          cliente: { select: { id: true, nome: true, telefone_principal: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.venda.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  findById(id: string, unitId: string): Promise<VendaFull | null> {
    return this.prisma.venda.findFirst({
      where: { id, unidade_id: unitId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, barcode: true } },
          },
          orderBy: { numero_item: 'asc' },
        },
        payments: { orderBy: { created_at: 'asc' } },
        cliente: { select: { id: true, nome: true, telefone_principal: true, email: true } },
      },
    }) as Promise<VendaFull | null>;
  }

  findBySyncId(syncId: string, unitId: string): Promise<Venda | null> {
    return this.prisma.venda.findFirst({ where: { sync_id: syncId, unidade_id: unitId } });
  }

  create(data: Prisma.VendaCreateInput): Promise<Venda> {
    return this.prisma.venda.create({ data });
  }

  update(id: string, unitId: string, data: Prisma.VendaUpdateInput): Promise<Venda> {
    return this.prisma.venda.update({ where: { id, unidade_id: unitId }, data });
  }

  addItem(vendaId: string, data: Prisma.VendaItemCreateInput): Promise<VendaItem> {
    return this.prisma.vendaItem.create({ data });
  }

  updateItem(
    itemId: string,
    vendaId: string,
    unitId: string,
    data: Prisma.VendaItemUpdateInput,
  ): Promise<VendaItem> {
    return this.prisma.vendaItem.update({
      where: {
        id: itemId,
        venda_id: vendaId,
        venda: { unidade_id: unitId },
      },
      data,
    });
  }

  deleteItem(itemId: string, vendaId: string, unitId: string): Promise<VendaItem> {
    return this.prisma.vendaItem.delete({
      where: {
        id: itemId,
        venda_id: vendaId,
        venda: { unidade_id: unitId },
      },
    });
  }

  createPayment(
    data: Prisma.VendaPaymentCreateInput,
  ): Promise<VendaPayment> {
    return this.prisma.vendaPayment.create({ data });
  }

  updatePayment(
    paymentId: string,
    vendaId: string,
    unitId: string,
    data: Prisma.VendaPaymentUpdateInput,
  ): Promise<VendaPayment> {
    return this.prisma.vendaPayment.update({
      where: {
        id: paymentId,
        venda_id: vendaId,
        venda: { unidade_id: unitId },
      },
      data,
    });
  }
}
