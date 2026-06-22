import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NfEntrada, NfEntradaStatus, Prisma, StockMovementType } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import {
  deriveTipoDocumento,
  validateCnpjCpf,
} from '../../common/validators/cnpj-cpf.validator';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { StorageFolder } from '../../common/storage/storage.types';
import { BulkBrandDto } from './dto/bulk-brand.dto';
import { CreateNfDto } from './dto/create-nf.dto';
import { QueryNfDto } from './dto/query-nf.dto';
import { UpdateNfDto } from './dto/update-nf.dto';
import { UpdateNfItemDto } from './dto/update-nf-item.dto';
import { NfEntradaRepository } from './nf-entrada.repository';
import { XmlParserService } from './xml-parser.service';

@Injectable()
export class NfEntradaService {
  constructor(
    private readonly repository: NfEntradaRepository,
    private readonly tenancy: TenancyService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly xmlParser: XmlParserService,
  ) {}

  async createFromXml(
    xmlBuffer: Buffer,
    user: JwtSystemPayload,
  ): Promise<NfEntrada> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const parsed = this.xmlParser.parse(xmlBuffer);

    if (parsed.chaveAcesso) {
      const dup = await this.repository.findByChaveAcesso(parsed.chaveAcesso, unitId);
      if (dup) {
        throw new ConflictException(
          `NF com chave de acesso ${parsed.chaveAcesso} já cadastrada nesta unidade`,
        );
      }
    }

    const fornecedorId = await this.resolveOrCreateSupplier(
      parsed.emitCnpj,
      parsed.emitNome,
      unitId,
    );

    let xmlUrl: string | null = null;
    try {
      const result = await this.storage.upload(xmlBuffer, {
        folder: StorageFolder.INVOICE_XML,
        filename: `${parsed.chaveAcesso || parsed.numero}.xml`,
        mime_type: 'application/xml',
      });
      xmlUrl = result.key;
    } catch {
      // File storage failure is non-blocking — NF is still created
    }

    return this.repository.create({
      unidade_id: unitId,
      created_by: user.sub,
      fornecedor_id: fornecedorId,
      numero: parsed.numero,
      serie: parsed.serie,
      chave_acesso: parsed.chaveAcesso || null,
      data_emissao: new Date(parsed.dataEmissao),
      valor_total: parsed.valorTotal,
      xml_url: xmlUrl,
      items: parsed.items.map((i) => ({
        numero_item: i.numeroItem,
        codigo_produto: i.codigoProduto,
        ean: i.ean,
        descricao: i.descricao,
        ncm: i.ncm,
        cfop: i.cfop,
        unidade_medida: i.unidadeMedida,
        quantidade: i.quantidade,
        valor_unitario: i.valorUnitario,
        valor_total: i.valorTotal,
        lote_numero: i.loteNumero,
        data_validade: i.dataValidade ? new Date(i.dataValidade) : null,
        data_fabricacao: i.dataFabricacao ? new Date(i.dataFabricacao) : null,
      })),
    });
  }

  async create(dto: CreateNfDto, user: JwtSystemPayload): Promise<NfEntrada> {
    const unitId = await this.tenancy.resolveUnitId(user);

    if (dto.chave_acesso) {
      const dup = await this.repository.findByChaveAcesso(dto.chave_acesso, unitId);
      if (dup) {
        throw new ConflictException(
          `NF com chave de acesso ${dto.chave_acesso} já cadastrada nesta unidade`,
        );
      }
    }

    if (dto.fornecedor_id) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.fornecedor_id, unidade_id: unitId },
        select: { id: true },
      });
      if (!supplier) throw new NotFoundException('Fornecedor não encontrado nesta unidade');
    }

    return this.repository.create({
      unidade_id: unitId,
      created_by: user.sub,
      fornecedor_id: dto.fornecedor_id ?? null,
      numero: dto.numero,
      serie: dto.serie ?? null,
      chave_acesso: dto.chave_acesso ?? null,
      data_emissao: new Date(dto.data_emissao),
      data_entrada: dto.data_entrada ? new Date(dto.data_entrada) : null,
      valor_total: dto.valor_total,
      items: dto.items.map((i) => ({
        numero_item: i.numero_item,
        codigo_produto: i.codigo_produto ?? null,
        ean: i.ean ?? null,
        descricao: i.descricao,
        ncm: i.ncm ?? null,
        cfop: i.cfop ?? null,
        unidade_medida: i.unidade_medida ?? null,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        valor_total: i.valor_total,
        lote_numero: i.lote_numero ?? null,
        data_validade: i.data_validade ? new Date(i.data_validade) : null,
        data_fabricacao: i.data_fabricacao ? new Date(i.data_fabricacao) : null,
        product_id: i.product_id ?? null,
        brand_id: i.brand_id ?? null,
      })),
    });
  }

  async listNfs(query: QueryNfDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    return this.repository.findAll(
      unitId,
      {
        status: query.status,
        fornecedor_id: query.fornecedor_id,
        data_inicio: query.data_inicio ? new Date(query.data_inicio) : undefined,
        data_fim: query.data_fim ? new Date(query.data_fim) : undefined,
      },
      { page: query.page ?? 1, limit: query.limit ?? 20 },
    );
  }

  async getNf(id: string, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const nf = await this.repository.findById(id, unitId);
    if (!nf) throw new NotFoundException('Nota fiscal não encontrada');
    return nf;
  }

  async updateNf(id: string, dto: UpdateNfDto, user: JwtSystemPayload): Promise<NfEntrada> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const nf = await this.repository.findById(id, unitId);
    if (!nf) throw new NotFoundException('Nota fiscal não encontrada');
    if (nf.status !== NfEntradaStatus.RASCUNHO) {
      throw new UnprocessableEntityException('Apenas notas em rascunho podem ser editadas');
    }

    if (dto.fornecedor_id) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.fornecedor_id, unidade_id: unitId },
        select: { id: true },
      });
      if (!supplier) throw new NotFoundException('Fornecedor não encontrado nesta unidade');
    }

    return this.repository.update(id, unitId, {
      ...(dto.fornecedor_id !== undefined && { fornecedor_id: dto.fornecedor_id }),
      ...(dto.data_entrada !== undefined && { data_entrada: new Date(dto.data_entrada) }),
      ...(dto.observacao !== undefined && { observacao: dto.observacao }),
    });
  }

  async updateItem(
    id: string,
    itemId: string,
    dto: UpdateNfItemDto,
    user: JwtSystemPayload,
  ) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const nf = await this.repository.findById(id, unitId);
    if (!nf) throw new NotFoundException('Nota fiscal não encontrada');
    if (nf.status !== NfEntradaStatus.RASCUNHO) {
      throw new UnprocessableEntityException('Apenas itens de notas em rascunho podem ser editados');
    }

    if (dto.product_id) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.product_id, unidade_id: unitId },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Produto não encontrado nesta unidade');
    }

    if (dto.brand_id) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: dto.brand_id, unidade_id: unitId },
        select: { id: true },
      });
      if (!brand) throw new NotFoundException('Marca não encontrada nesta unidade');
    }

    return this.repository.updateItem(itemId, id, unitId, {
      ...(dto.product_id !== undefined && { product_id: dto.product_id }),
      ...(dto.brand_id !== undefined && { brand_id: dto.brand_id }),
      ...(dto.lote_numero !== undefined && { lote_numero: dto.lote_numero }),
      ...(dto.data_validade !== undefined && {
        data_validade: dto.data_validade ? new Date(dto.data_validade) : null,
      }),
      ...(dto.data_fabricacao !== undefined && {
        data_fabricacao: dto.data_fabricacao ? new Date(dto.data_fabricacao) : null,
      }),
    });
  }

  async bulkSetBrand(id: string, dto: BulkBrandDto, user: JwtSystemPayload): Promise<{ updated: number }> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const nf = await this.repository.findById(id, unitId);
    if (!nf) throw new NotFoundException('Nota fiscal não encontrada');
    if (nf.status !== NfEntradaStatus.RASCUNHO) {
      throw new UnprocessableEntityException('Apenas notas em rascunho podem ser editadas');
    }

    const brand = await this.prisma.brand.findFirst({
      where: { id: dto.brand_id, unidade_id: unitId },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException('Marca não encontrada nesta unidade');

    const updated = await this.repository.bulkSetBrand(id, unitId, dto.brand_id);
    return { updated };
  }

  async attachPdf(id: string, pdfBuffer: Buffer, user: JwtSystemPayload): Promise<NfEntrada> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const nf = await this.repository.findById(id, unitId);
    if (!nf) throw new NotFoundException('Nota fiscal não encontrada');

    const result = await this.storage.upload(pdfBuffer, {
      folder: StorageFolder.INVOICE_PDF,
      filename: `${nf.chave_acesso || nf.numero}.pdf`,
      mime_type: 'application/pdf',
    });

    return this.repository.update(id, unitId, { pdf_url: result.key });
  }

  async confirmNf(id: string, user: JwtSystemPayload): Promise<NfEntrada> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const nf = await this.repository.findById(id, unitId);
    if (!nf) throw new NotFoundException('Nota fiscal não encontrada');

    if (nf.status !== NfEntradaStatus.RASCUNHO) {
      throw new UnprocessableEntityException(
        'Apenas notas em rascunho podem ser confirmadas',
      );
    }

    const unlinked = await this.repository.countUnlinkedItems(id, unitId);
    if (unlinked > 0) {
      throw new UnprocessableEntityException(
        `${unlinked} item(ns) sem produto vinculado. Vincule todos os itens antes de confirmar.`,
      );
    }

    const items = await this.repository.findItemsByNf(id, unitId);

    await this.prisma.$transaction(async (tx) => {
      // Re-check status inside transaction to prevent concurrent double-confirm
      const locked = await tx.nfEntrada.findFirst({
        where: { id, unidade_id: unitId, status: NfEntradaStatus.RASCUNHO },
        select: { id: true, numero: true },
      });
      if (!locked) {
        throw new UnprocessableEntityException('Apenas notas em rascunho podem ser confirmadas');
      }

      for (const item of items) {
        const lotCode =
          item.lote_numero ?? `NF${nf.numero}-I${item.numero_item}`;

        // upsert = atomic find-or-create; prevents duplicate lots on concurrent confirms
        const lot = await tx.lot.upsert({
          where: {
            unidade_id_product_id_code: {
              unidade_id: unitId,
              product_id: item.product_id!,
              code: lotCode,
            },
          },
          create: {
            code: lotCode,
            quantity_received: item.quantidade,
            tags: [],
            active: true,
            notes: null,
            expires_at: item.data_validade ?? null,
            manufactured_at: item.data_fabricacao ?? null,
            invoice_item_id: item.id,
            unidade_id: unitId,
            product_id: item.product_id!,
          },
          update: {},
          select: { id: true },
        });

        await tx.stockMovement.upsert({
          where: {
            idempotency_key: `nf-confirm-${item.id}`,
          },
          create: {
            unidade_id: unitId,
            product_id: item.product_id!,
            lot_id: lot.id,
            type: StockMovementType.PURCHASE_ENTRY,
            quantity: item.quantidade,
            reference_id: item.id,
            reference_type: 'invoice_item',
            idempotency_key: `nf-confirm-${item.id}`,
            notes: `NF ${nf.numero} - Item ${item.numero_item}`,
            created_by: user.sub,
          },
          update: {},
        });

        // Atualiza preço de custo do produto a partir da NF (apenas se ainda não definido)
        if (item.valor_unitario > 0) {
          const pricing = await tx.productPricing.findUnique({
            where: { product_id: item.product_id! },
            select: { cost_price_cents: true, sale_price_cents: true },
          });
          if (pricing && pricing.cost_price_cents === 0) {
            const newCost = item.valor_unitario;
            const sale = pricing.sale_price_cents;
            const marginCents = sale - newCost;
            const marginPct = sale > 0 ? (marginCents / sale) * 100 : 0;
            await tx.productPricing.update({
              where: { product_id: item.product_id! },
              data: {
                cost_price_cents: newCost,
                margin_cents: marginCents,
                margin_pct: new Prisma.Decimal(marginPct.toFixed(4)),
              },
            });
          }
        }
      }

      await tx.nfEntrada.update({
        where: { id, unidade_id: unitId },
        data: { status: NfEntradaStatus.CONFIRMADA },
      });
    });

    return (await this.repository.findById(id, unitId))!;
  }

  async cancelNf(id: string, user: JwtSystemPayload): Promise<NfEntrada> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const nf = await this.repository.findById(id, unitId);
    if (!nf) throw new NotFoundException('Nota fiscal não encontrada');

    if (nf.status !== NfEntradaStatus.RASCUNHO) {
      throw new UnprocessableEntityException(
        'Apenas notas em rascunho podem ser canceladas',
      );
    }

    return this.repository.updateStatus(id, unitId, NfEntradaStatus.CANCELADA);
  }

  private async resolveOrCreateSupplier(
    cnpj: string,
    razaoSocial: string,
    unitId: string,
  ): Promise<string | null> {
    if (!validateCnpjCpf(cnpj)) return null;

    const existing = await this.prisma.supplier.findFirst({
      where: { document: cnpj, unidade_id: unitId },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await this.prisma.supplier.create({
      data: {
        document: cnpj,
        document_type: deriveTipoDocumento(cnpj),
        razao_social: razaoSocial.slice(0, 200) || 'Fornecedor (importado de XML)',
        unidade_id: unitId,
      },
      select: { id: true },
    });
    return created.id;
  }
}
