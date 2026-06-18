import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Brand, Prisma } from '@prisma/client';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { StorageService } from '../../common/storage/storage.service';
import { StorageFolder } from '../../common/storage/storage.types';
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
    private readonly storage: StorageService,
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

    return this.repository.create({
      unidade_id: unitId,
      name: dto.name,
      slug,
      logo_url: dto.logo_url,
    });
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

    if (dto.logo_url !== undefined) {
      updateData.logo_url = dto.logo_url;
      // When setting an external URL, clear any stored file key
      updateData.logo_storage_key = null;
    }

    return this.repository.update(id, updateData);
  }

  async uploadLogo(id: string, file: Express.Multer.File, user: JwtSystemPayload): Promise<Brand> {
    const brand = await this.findById(id, user);

    // Delete previous stored logo before uploading new one
    if (brand.logo_storage_key) {
      await this.storage.delete(brand.logo_storage_key).catch(() => {});
    }

    const result = await this.storage.upload(file.buffer, {
      folder: StorageFolder.BRAND_LOGO,
      filename: file.originalname,
      mime_type: file.mimetype,
      public: true,
    });

    const logo_url = this.storage.getPublicUrl(result.key);

    return this.repository.updateLogoFields(id, logo_url, result.key);
  }

  async removeLogo(id: string, user: JwtSystemPayload): Promise<Brand> {
    const brand = await this.findById(id, user);

    if (brand.logo_storage_key) {
      await this.storage.delete(brand.logo_storage_key).catch(() => {});
    }

    return this.repository.updateLogoFields(id, null, null);
  }

  async delete(id: string, user: JwtSystemPayload): Promise<void> {
    const brand = await this.findById(id, user);

    const links = await this.repository.countProductLinks(id);

    if (links > 0) {
      throw new ConflictException(
        'Esta marca possui produtos vinculados. Desative-a em vez de excluir.',
      );
    }

    // Clean up stored logo before deleting brand record
    if (brand.logo_storage_key) {
      await this.storage.delete(brand.logo_storage_key).catch(() => {});
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
