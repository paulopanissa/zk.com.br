import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { ReorderMediaDto } from './dto/reorder-media.dto';
import { SimulatePricingDto } from './dto/simulate-pricing.dto';
import { UpdateProductDeliveryDto } from './dto/update-product-delivery.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductFiscalDto } from './dto/update-product-fiscal.dto';
import { UpdateProductPricingDto } from './dto/update-product-pricing.dto';
import { UpdateProductSeoDto } from './dto/update-product-seo.dto';
import { ProductFull, ProductsRepository } from './products.repository';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function calcMargin(
  costCents: number,
  saleCents: number,
): { margin_cents: number; margin_pct: number } {
  const margin_cents = saleCents - costCents;
  const margin_pct = saleCents > 0 ? (margin_cents / saleCents) * 100 : 0;
  return { margin_cents, margin_pct };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly repository: ProductsRepository,
    private readonly tenancy: TenancyService,
  ) {}

  async create(dto: CreateProductDto, user: JwtSystemPayload): Promise<ProductFull> {
    const unitId = await this.tenancy.resolveUnitId(user);

    let slug = slugify(dto.name);
    let suffix = 2;
    while (await this.repository.findBySlug(slug, unitId)) {
      slug = `${slugify(dto.name)}-${suffix++}`;
    }

    if (dto.sku) {
      const existing = await this.repository.findBySku(dto.sku, unitId);
      if (existing) throw new ConflictException(`SKU '${dto.sku}' já cadastrado nesta unidade`);
    }

    if (dto.barcode) {
      const existing = await this.repository.findByBarcode(dto.barcode, unitId);
      if (existing)
        throw new ConflictException(`Barcode '${dto.barcode}' já cadastrado nesta unidade`);
    }

    const data: Prisma.ProductCreateInput = {
      name: dto.name,
      slug,
      sku: dto.sku ?? null,
      barcode: dto.barcode ?? null,
      description: dto.description ?? null,
      short_description: dto.short_description ?? null,
      unit: dto.unit ?? 'UN',
      active: dto.active ?? true,
      featured: dto.featured ?? false,
      min_stock: dto.min_stock ?? 0,
      unit_rel: { connect: { id: unitId } },
      ...(dto.category_id ? { category: { connect: { id: dto.category_id } } } : {}),
      ...(dto.brand_id ? { brand: { connect: { id: dto.brand_id } } } : {}),
    };

    return this.repository.create(data);
  }

  async findAll(filters: ListProductsDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const {
      name,
      sku,
      barcode,
      category_id,
      brand_id,
      active,
      featured,
      page = 1,
      limit = 20,
    } = filters;
    return this.repository.findAll(
      unitId,
      { name, sku, barcode, category_id, brand_id, active, featured },
      { page, limit },
    );
  }

  async findById(id: string, user: JwtSystemPayload): Promise<ProductFull> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const product = await this.repository.findById(id, unitId);
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async update(id: string, dto: UpdateProductDto, user: JwtSystemPayload): Promise<ProductFull> {
    const product = await this.findById(id, user);
    const unitId = await this.tenancy.resolveUnitId(user);

    if (dto.sku !== undefined && dto.sku !== product.sku) {
      if (dto.sku) {
        const existing = await this.repository.findBySku(dto.sku, unitId);
        if (existing) throw new ConflictException(`SKU '${dto.sku}' já cadastrado nesta unidade`);
      }
    }

    if (dto.barcode !== undefined && dto.barcode !== product.barcode) {
      if (dto.barcode) {
        const existing = await this.repository.findByBarcode(dto.barcode, unitId);
        if (existing)
          throw new ConflictException(`Barcode '${dto.barcode}' já cadastrado nesta unidade`);
      }
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      if (dto.name !== product.name) {
        let slug = slugify(dto.name);
        let suffix = 2;
        while (true) {
          const existing = await this.repository.findBySlug(slug, unitId);
          if (!existing || existing.id === id) break;
          slug = `${slugify(dto.name)}-${suffix++}`;
        }
        updateData.slug = slug;
      }
    }

    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.short_description !== undefined) updateData.short_description = dto.short_description;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.featured !== undefined) updateData.featured = dto.featured;
    if (dto.min_stock !== undefined) updateData.min_stock = dto.min_stock;
    if (dto.category_id !== undefined) {
      updateData.category = dto.category_id
        ? { connect: { id: dto.category_id } }
        : { disconnect: true };
    }
    if (dto.brand_id !== undefined) {
      updateData.brand = dto.brand_id
        ? { connect: { id: dto.brand_id } }
        : { disconnect: true };
    }

    return this.repository.update(id, unitId, updateData);
  }

  async deactivate(id: string, user: JwtSystemPayload): Promise<void> {
    const unitId = await this.tenancy.resolveUnitId(user);
    await this.findById(id, user);
    const loteLinks = await this.repository.countLoteLinks(id);
    if (loteLinks > 0) {
      throw new ConflictException(
        'Produto possui lotes vinculados. Remova os lotes antes de excluir ou desative o produto.',
      );
    }
    await this.repository.deactivate(id, unitId);
  }

  async updatePricing(id: string, dto: UpdateProductPricingDto, user: JwtSystemPayload) {
    const product = await this.findById(id, user);

    const current = product.pricing;
    const costCents = dto.cost_price_cents ?? current?.cost_price_cents ?? 0;
    const saleCents = dto.sale_price_cents ?? current?.sale_price_cents ?? 0;

    const { margin_cents, margin_pct } = calcMargin(costCents, saleCents);

    const data: Prisma.ProductPricingUpdateInput = {
      ...dto,
      margin_cents,
      margin_pct: new Prisma.Decimal(margin_pct.toFixed(4)),
    };

    return this.repository.updatePricing(id, data);
  }

  simulatePricing(dto: SimulatePricingDto) {
    const { cost_price_cents, sale_price_cents } = dto;
    const { margin_cents, margin_pct } = calcMargin(cost_price_cents, sale_price_cents);
    // Return margin_pct as a fixed-precision string to avoid IEEE 754 float representation.
    // Consistent with how updatePricing stores it via Prisma.Decimal.
    return {
      cost_price_cents,
      sale_price_cents,
      margin_cents,
      margin_pct: margin_pct.toFixed(4),
    };
  }

  async updateDelivery(id: string, dto: UpdateProductDeliveryDto, user: JwtSystemPayload) {
    await this.findById(id, user);
    return this.repository.updateDelivery(id, dto);
  }

  async updateFiscal(id: string, dto: UpdateProductFiscalDto, user: JwtSystemPayload) {
    await this.findById(id, user);

    if (dto.cst_icms && dto.csosn) {
      throw new UnprocessableEntityException(
        'CST e CSOSN são mutuamente exclusivos. Informe apenas um.',
      );
    }

    return this.repository.updateFiscal(id, dto);
  }

  async updateSeo(id: string, dto: UpdateProductSeoDto, user: JwtSystemPayload) {
    await this.findById(id, user);
    const data: Prisma.ProductSeoUpdateInput = {
      ...(dto.seo_title !== undefined && { seo_title: dto.seo_title }),
      ...(dto.seo_description !== undefined && { seo_description: dto.seo_description }),
      ...(dto.seo_keywords !== undefined && { seo_keywords: dto.seo_keywords }),
      ...(dto.schema_org_json !== undefined && {
        schema_org_json: dto.schema_org_json as Prisma.InputJsonValue,
      }),
    };
    return this.repository.updateSeo(id, data);
  }

  async enqueueSeoGeneration(id: string, user: JwtSystemPayload): Promise<void> {
    await this.findById(id, user);
    // TODO: enqueue RabbitMQ task for AI/SEO module (27) to generate SEO content and Schema.org JSON-LD
    // Example: await this.amqpConnection.publish('erp', 'seo.generate', { product_id: id });
  }

  async addMedia(
    id: string,
    data: {
      url: string;
      storage_key: string;
      media_type: 'IMAGE' | 'VIDEO';
      alt_text?: string;
    },
    user: JwtSystemPayload,
  ) {
    const product = await this.findById(id, user);
    const maxOrder =
      product.media.length > 0 ? Math.max(...product.media.map((m) => m.sort_order)) : -1;
    return this.repository.addMedia(id, {
      url: data.url,
      storage_key: data.storage_key,
      media_type: data.media_type,
      alt_text: data.alt_text ?? null,
      sort_order: maxOrder + 1,
    });
  }

  async deleteMedia(id: string, mediaId: string, user: JwtSystemPayload): Promise<void> {
    await this.findById(id, user);
    const media = await this.repository.findMediaById(mediaId);
    if (!media || media.product_id !== id) {
      throw new NotFoundException('Mídia não encontrada para este produto');
    }
    // TODO: delete from storage when Storage module (25) is implemented
    // Example: await this.storageService.delete(media.storage_key);
    await this.repository.deleteMedia(mediaId);
  }

  async reorderMedia(id: string, dto: ReorderMediaDto, user: JwtSystemPayload) {
    const product = await this.findById(id, user);
    const productMediaIds = new Set(product.media.map((m) => m.id));
    for (const item of dto.items) {
      if (!productMediaIds.has(item.id)) {
        throw new NotFoundException(`Mídia ${item.id} não encontrada para este produto`);
      }
    }
    return this.repository.reorderMedia(dto.items);
  }
}
