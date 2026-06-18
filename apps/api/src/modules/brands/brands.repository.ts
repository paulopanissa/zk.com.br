import { Injectable } from '@nestjs/common';
import { Brand, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface BrandPage {
  data: Brand[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    unitId: string,
    filters: { name?: string; active?: boolean },
    pagination: { page: number; limit: number },
  ): Promise<BrandPage> {
    const where: Prisma.BrandWhereInput = { unidade_id: unitId };

    if (filters.name !== undefined) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.brand.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  findById(id: string, unitId: string): Promise<Brand | null> {
    return this.prisma.brand.findFirst({
      where: { id, unidade_id: unitId },
    });
  }

  findByName(name: string, unitId: string): Promise<Brand | null> {
    return this.prisma.brand.findFirst({
      where: {
        unidade_id: unitId,
        name: { equals: name, mode: 'insensitive' },
      },
    });
  }

  findBySlug(slug: string, unitId: string): Promise<Brand | null> {
    return this.prisma.brand.findFirst({
      where: { unidade_id: unitId, slug },
    });
  }

  create(data: { unidade_id: string; name: string; slug: string; logo_url?: string }): Promise<Brand> {
    return this.prisma.brand.create({ data });
  }

  updateLogoFields(id: string, logo_url: string | null, logo_storage_key: string | null): Promise<Brand> {
    return this.prisma.brand.update({
      where: { id },
      data: { logo_url, logo_storage_key },
    });
  }

  update(id: string, data: Prisma.BrandUpdateInput): Promise<Brand> {
    return this.prisma.brand.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<Brand> {
    return this.prisma.brand.update({ where: { id }, data: { active: false } });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.brand.delete({ where: { id } });
  }

  async countProductLinks(id: string): Promise<number> {
    // TODO: when the Product model is added to the schema, replace this with:
    //   return this.prisma.product.count({ where: { brand_id: id } });
    return 0;
  }
}
