import { Injectable } from '@nestjs/common';
import { MediaType, Prisma, Product } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ProductFull = NonNullable<Awaited<ReturnType<ProductsRepository['findById']>>>;

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get fullInclude() {
    return {
      pricing: true,
      media: { orderBy: { sort_order: 'asc' as const } },
      delivery: true,
      fiscal: true,
      seo: true,
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
    };
  }

  async findAll(
    unitId: string,
    filters: {
      name?: string;
      sku?: string;
      barcode?: string;
      category_id?: string;
      brand_id?: string;
      active?: boolean;
      featured?: boolean;
    },
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.ProductWhereInput = { unidade_id: unitId };

    if (filters.name) where.name = { contains: filters.name, mode: 'insensitive' };
    if (filters.sku) where.sku = { contains: filters.sku, mode: 'insensitive' };
    if (filters.barcode) where.barcode = { contains: filters.barcode };
    if (filters.category_id !== undefined) where.category_id = filters.category_id;
    if (filters.brand_id !== undefined) where.brand_id = filters.brand_id;
    if (filters.active !== undefined) where.active = filters.active;
    if (filters.featured !== undefined) where.featured = filters.featured;

    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { name: 'asc' },
        include: this.fullInclude,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  findById(id: string, unitId: string) {
    return this.prisma.product.findFirst({
      where: { id, unidade_id: unitId },
      include: this.fullInclude,
    });
  }

  findBySlug(slug: string, unitId: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { unidade_id_slug: { unidade_id: unitId, slug } },
    });
  }

  findBySku(sku: string, unitId: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { unidade_id: unitId, sku: { equals: sku, mode: 'insensitive' } },
    });
  }

  findByBarcode(barcode: string, unitId: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { unidade_id_barcode: { unidade_id: unitId, barcode } },
    });
  }

  async create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({
      data: {
        ...data,
        pricing: { create: {} },
        delivery: { create: {} },
        fiscal: { create: {} },
        seo: { create: { seo_keywords: [] } },
      },
      include: this.fullInclude,
    });
  }

  update(id: string, unitId: string, data: Prisma.ProductUpdateInput) {
    // Scope enforced at write level: id (PK) + unidade_id prevents cross-unit mutation
    // even if the service-level findById guard is bypassed by a future caller.
    return this.prisma.product.update({
      where: { id, unidade_id: unitId } as Prisma.ProductWhereUniqueInput,
      data,
      include: this.fullInclude,
    });
  }

  deactivate(id: string, unitId: string) {
    return this.prisma.product.update({
      where: { id, unidade_id: unitId } as Prisma.ProductWhereUniqueInput,
      data: { active: false },
    });
  }

  updatePricing(productId: string, data: Prisma.ProductPricingUpdateInput) {
    return this.prisma.productPricing.update({
      where: { product_id: productId },
      data,
    });
  }

  updateDelivery(productId: string, data: Prisma.ProductDeliveryUpdateInput) {
    return this.prisma.productDelivery.update({
      where: { product_id: productId },
      data,
    });
  }

  updateFiscal(productId: string, data: Prisma.ProductFiscalUpdateInput) {
    return this.prisma.productFiscal.update({
      where: { product_id: productId },
      data,
    });
  }

  updateSeo(productId: string, data: Prisma.ProductSeoUpdateInput) {
    return this.prisma.productSeo.update({
      where: { product_id: productId },
      data,
    });
  }

  addMedia(
    productId: string,
    data: {
      url: string;
      storage_key: string;
      media_type: MediaType;
      alt_text?: string | null;
      sort_order: number;
    },
  ) {
    return this.prisma.productMedia.create({
      data: { ...data, product: { connect: { id: productId } } },
    });
  }

  deleteMedia(mediaId: string) {
    return this.prisma.productMedia.delete({ where: { id: mediaId } });
  }

  findMediaById(mediaId: string) {
    return this.prisma.productMedia.findUnique({ where: { id: mediaId } });
  }

  reorderMedia(updates: { id: string; sort_order: number }[]) {
    return this.prisma.$transaction(
      updates.map(({ id, sort_order }) =>
        this.prisma.productMedia.update({ where: { id }, data: { sort_order } }),
      ),
    );
  }

  countLoteLinks(id: string): Promise<number> {
    // GUARD INATIVO — aguardando módulo 4 (Lotes/Estoque).
    // Quando StockLot for adicionado ao schema, substituir por:
    //   return this.prisma.stockLot.count({ where: { product_id: id } });
    // Enquanto isso, deactivate() nunca lança 409 por esta condição.
    void id;
    return Promise.resolve(0);
  }
}
