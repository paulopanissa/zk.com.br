import { Injectable } from '@nestjs/common';
import { NfEntrada, NfEntradaItem, NfEntradaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface NfEntradaPage {
  data: NfEntrada[];
  total: number;
  page: number;
  limit: number;
}

export interface NfEntradaFilters {
  status?: NfEntradaStatus;
  fornecedor_id?: string;
  data_inicio?: Date;
  data_fim?: Date;
}

@Injectable()
export class NfEntradaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    unitId: string,
    filters: NfEntradaFilters,
    pagination: { page: number; limit: number },
  ): Promise<NfEntradaPage> {
    const where: Prisma.NfEntradaWhereInput = { unidade_id: unitId };
    if (filters.status) where.status = filters.status;
    if (filters.fornecedor_id) where.fornecedor_id = filters.fornecedor_id;
    if (filters.data_inicio || filters.data_fim) {
      where.data_emissao = {};
      if (filters.data_inicio) where.data_emissao.gte = filters.data_inicio;
      if (filters.data_fim) where.data_emissao.lte = filters.data_fim;
    }

    const skip = (pagination.page - 1) * pagination.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.nfEntrada.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { data_emissao: 'desc' },
        include: {
          fornecedor: { select: { id: true, razao_social: true, document: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.nfEntrada.count({ where }),
    ]);

    return { data: data as unknown as NfEntrada[], total, page: pagination.page, limit: pagination.limit };
  }

  findById(id: string, unitId: string) {
    return this.prisma.nfEntrada.findFirst({
      where: { id, unidade_id: unitId },
      include: {
        fornecedor: { select: { id: true, razao_social: true, nome_fantasia: true, document: true } },
        items: { orderBy: { numero_item: 'asc' } },
      },
    });
  }

  create(data: {
    unidade_id: string;
    created_by: string;
    fornecedor_id?: string | null;
    numero: string;
    serie?: string | null;
    chave_acesso?: string | null;
    data_emissao: Date;
    data_entrada?: Date | null;
    valor_total: number;
    xml_url?: string | null;
    observacao?: string | null;
    items: Array<{
      numero_item: number;
      codigo_produto?: string | null;
      ean?: string | null;
      descricao: string;
      ncm?: string | null;
      cfop?: string | null;
      unidade_medida?: string | null;
      quantidade: number;
      valor_unitario: number;
      valor_total: number;
      lote_numero?: string | null;
      data_validade?: Date | null;
      data_fabricacao?: Date | null;
      product_id?: string | null;
      brand_id?: string | null;
    }>;
  }): Promise<NfEntrada> {
    return this.prisma.nfEntrada.create({
      data: {
        unidade_id: data.unidade_id,
        created_by: data.created_by,
        fornecedor_id: data.fornecedor_id ?? null,
        numero: data.numero,
        serie: data.serie ?? null,
        chave_acesso: data.chave_acesso ?? null,
        data_emissao: data.data_emissao,
        data_entrada: data.data_entrada ?? null,
        valor_total: data.valor_total,
        xml_url: data.xml_url ?? null,
        observacao: data.observacao ?? null,
        items: {
          create: data.items.map((i) => ({
            numero_item: i.numero_item,
            codigo_produto: i.codigo_produto ?? null,
            ean: i.ean ?? null,
            descricao: i.descricao,
            ncm: i.ncm ?? null,
            cfop: i.cfop ?? null,
            unidade_medida: i.unidade_medida ?? null,
            quantidade: new Prisma.Decimal(i.quantidade),
            valor_unitario: i.valor_unitario,
            valor_total: i.valor_total,
            lote_numero: i.lote_numero ?? null,
            data_validade: i.data_validade ?? null,
            data_fabricacao: i.data_fabricacao ?? null,
            product_id: i.product_id ?? null,
            brand_id: i.brand_id ?? null,
          })),
        },
      },
    });
  }

  update(id: string, unitId: string, data: Prisma.NfEntradaUpdateInput): Promise<NfEntrada> {
    return this.prisma.nfEntrada.update({
      where: { id, unidade_id: unitId },
      data,
    });
  }

  updateItem(
    itemId: string,
    nfId: string,
    unitId: string,
    data: Prisma.NfEntradaItemUpdateInput,
  ): Promise<NfEntradaItem> {
    return this.prisma.nfEntradaItem.update({
      where: {
        id: itemId,
        nf_entrada_id: nfId,
        nf_entrada: { unidade_id: unitId },
      },
      data,
    });
  }

  async bulkSetBrand(nfId: string, unitId: string, brandId: string): Promise<number> {
    const result = await this.prisma.$executeRaw`
      UPDATE nf_entrada_items ni
      SET brand_id = ${brandId}, updated_at = NOW()
      FROM nf_entradas n
      WHERE ni.nf_entrada_id = n.id
        AND n.id = ${nfId}
        AND n.unidade_id = ${unitId}
    `;
    return result;
  }

  updateStatus(id: string, unitId: string, status: NfEntradaStatus): Promise<NfEntrada> {
    return this.prisma.nfEntrada.update({
      where: { id, unidade_id: unitId },
      data: { status },
    });
  }

  countUnlinkedItems(nfId: string, unitId: string): Promise<number> {
    return this.prisma.nfEntradaItem.count({
      where: {
        nf_entrada_id: nfId,
        product_id: null,
        nf_entrada: { unidade_id: unitId },
      },
    });
  }

  findItemsByNf(nfId: string, unitId: string): Promise<NfEntradaItem[]> {
    return this.prisma.nfEntradaItem.findMany({
      where: {
        nf_entrada_id: nfId,
        nf_entrada: { unidade_id: unitId },
      },
      orderBy: { numero_item: 'asc' },
    });
  }

  findByChaveAcesso(chaveAcesso: string, unitId: string): Promise<NfEntrada | null> {
    return this.prisma.nfEntrada.findFirst({
      where: { chave_acesso: chaveAcesso, unidade_id: unitId },
    });
  }
}
