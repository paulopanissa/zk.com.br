import { Injectable } from '@nestjs/common';
import { CostCenter, CostItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CostCenterWithItemCount extends CostCenter {
  _count: { items: number };
}

export interface CostCenterWithItems extends CostCenter {
  items: CostItem[];
}

export interface CostCenterPage {
  data: CostCenterWithItemCount[];
  total: number;
  page: number;
  limit: number;
}

export interface CostSummary {
  total_fixo_centavos: number;
  total_variavel_bps: number;
  items: CostItem[];
}

@Injectable()
export class CostCenterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    unitId: string,
    filters: { ativo?: boolean },
    pagination: { page: number; limit: number },
  ): Promise<CostCenterPage> {
    const where: Prisma.CostCenterWhereInput = { unidade_id: unitId };

    if (filters.ativo !== undefined) {
      where.ativo = filters.ativo;
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.costCenter.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { nome: 'asc' },
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.costCenter.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  findById(id: string, unitId: string): Promise<CostCenterWithItems | null> {
    return this.prisma.costCenter.findFirst({
      where: { id, unidade_id: unitId },
      include: { items: { orderBy: { nome: 'asc' } } },
    });
  }

  findByNome(nome: string, unitId: string): Promise<CostCenter | null> {
    return this.prisma.costCenter.findFirst({
      where: {
        unidade_id: unitId,
        nome: { equals: nome, mode: 'insensitive' },
      },
    });
  }

  create(data: {
    unidade_id: string;
    nome: string;
    descricao?: string;
    faturamento_mensal_centavos?: number | null;
  }): Promise<CostCenter> {
    return this.prisma.costCenter.create({ data });
  }

  update(id: string, data: Prisma.CostCenterUpdateInput): Promise<CostCenter> {
    return this.prisma.costCenter.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<CostCenter> {
    return this.prisma.costCenter.update({ where: { id }, data: { ativo: false } });
  }

  countActiveItems(costCenterId: string): Promise<number> {
    return this.prisma.costItem.count({
      where: { cost_center_id: costCenterId, ativo: true },
    });
  }

  findItemById(itemId: string, unitId: string): Promise<CostItem | null> {
    return this.prisma.costItem.findFirst({
      where: { id: itemId, unidade_id: unitId },
    });
  }

  addItem(
    costCenterId: string,
    unitId: string,
    data: {
      nome: string;
      tipo: CostItem['tipo'];
      valor_centavos?: number;
      percentual_bps?: number;
      descricao?: string;
    },
  ): Promise<CostItem> {
    return this.prisma.costItem.create({
      data: {
        cost_center_id: costCenterId,
        unidade_id: unitId,
        nome: data.nome,
        tipo: data.tipo,
        valor_centavos: data.valor_centavos ?? null,
        percentual_bps: data.percentual_bps ?? null,
        descricao: data.descricao ?? null,
      },
    });
  }

  updateItem(itemId: string, data: Prisma.CostItemUpdateInput): Promise<CostItem> {
    return this.prisma.costItem.update({ where: { id: itemId }, data });
  }

  deactivateItem(itemId: string): Promise<CostItem> {
    return this.prisma.costItem.update({ where: { id: itemId }, data: { ativo: false } });
  }

  getActiveItems(unitId: string): Promise<CostItem[]> {
    return this.prisma.costItem.findMany({
      where: { unidade_id: unitId, ativo: true },
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    });
  }
}
