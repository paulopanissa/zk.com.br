import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Brand, Prisma } from '@prisma/client';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { BrandPage, BrandsRepository } from './brands.repository';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ListBrandsDto } from './dto/list-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class BrandsService {
  constructor(
    private readonly repository: BrandsRepository,
    private readonly tenancy: TenancyService,
  ) {}

  async create(dto: CreateBrandDto, user: JwtSystemPayload): Promise<Brand> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const existing = await this.repository.findByName(dto.name, unitId);

    if (existing) {
      throw new ConflictException('Já existe uma marca com este nome nesta unidade');
    }

    let slug = slugify(dto.name);
    let suffix = 2;

    while (await this.repository.findBySlug(slug, unitId)) {
      slug = `${slugify(dto.name)}-${suffix}`;
      suffix++;
    }

    return this.repository.create({ unidade_id: unitId, name: dto.name, slug });
  }

  async findAll(filters: ListBrandsDto, user: JwtSystemPayload): Promise<BrandPage> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { name, active, page = 1, limit = 20 } = filters;
    return this.repository.findAll(unitId, { name, active }, { page, limit });
  }

  async findById(id: string, user: JwtSystemPayload): Promise<Brand> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const brand = await this.repository.findById(id, unitId);

    if (!brand) {
      throw new NotFoundException('Marca não encontrada');
    }

    return brand;
  }

  async update(id: string, dto: UpdateBrandDto, user: JwtSystemPayload): Promise<Brand> {
    const brand = await this.findById(id, user);
    const unitId = await this.tenancy.resolveUnitId(user);

    const updateData: Prisma.BrandUpdateInput = {};

    if (dto.name !== undefined && dto.name !== brand.name) {
      const conflict = await this.repository.findByName(dto.name, unitId);

      if (conflict && conflict.id !== id) {
        throw new ConflictException('Já existe uma marca com este nome nesta unidade');
      }

      updateData.name = dto.name;
      updateData.slug = await this.buildUniqueSlug(dto.name, unitId, id);
    }

    if (dto.active !== undefined) {
      updateData.active = dto.active;
    }

    return this.repository.update(id, updateData);
  }

  async delete(id: string, user: JwtSystemPayload): Promise<void> {
    await this.findById(id, user);

    const links = await this.repository.countProductLinks(id);

    if (links > 0) {
      throw new ConflictException(
        'Esta marca possui produtos vinculados. Desative-a em vez de excluir.',
      );
    }

    await this.repository.hardDelete(id);
  }

  private async buildUniqueSlug(name: string, unitId: string, excludeId?: string): Promise<string> {
    let slug = slugify(name);
    let suffix = 2;

    while (true) {
      const found = await this.repository.findBySlug(slug, unitId);

      if (!found || found.id === excludeId) break;

      slug = `${slugify(name)}-${suffix}`;
      suffix++;
    }

    return slug;
  }
}
