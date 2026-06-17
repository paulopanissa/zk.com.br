import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Category } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { CategoriesRepository, CategoryWithChildren } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly repository: CategoriesRepository,
    private readonly tenancy: TenancyService,
  ) {}

  async create(dto: CreateCategoryDto, user: JwtSystemPayload): Promise<CategoryWithChildren> {
    const unitId = await this.tenancy.resolveUnitId(user);

    // Validar hierarquia: máximo 2 níveis (raiz + subcategoria)
    if (dto.parent_id) {
      const parent = await this.repository.findById(dto.parent_id, unitId);

      if (!parent) {
        throw new NotFoundException('Categoria pai não encontrada');
      }

      if (parent.parent_id !== null) {
        throw new UnprocessableEntityException(
          'Subcategorias não podem ter filhos. Máximo 2 níveis de hierarquia.',
        );
      }
    }

    // Verificar unicidade de nome no mesmo nível
    const parentId = dto.parent_id ?? null;
    const existingByName = await this.repository.findByName(dto.name, parentId, unitId);

    if (existingByName) {
      throw new ConflictException(
        `Já existe uma categoria com o nome "${dto.name}" neste nível.`,
      );
    }

    // Gerar slug único no mesmo nível (unidade + parent_id)
    let slug = slugify(dto.name);
    let suffix = 2;

    while (await this.repository.findBySlug(slug, parentId, unitId)) {
      slug = `${slugify(dto.name)}-${suffix}`;
      suffix++;
    }

    const category = await this.repository.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      sort_order: dto.sort_order ?? 0,
      unit: { connect: { id: unitId } },
      parent: dto.parent_id ? { connect: { id: dto.parent_id } } : undefined,
    });

    // Re-fetch com filhos para retorno consistente
    return this.repository.findById(category.id, unitId) as Promise<CategoryWithChildren>;
  }

  async findAll(
    query: ListCategoriesDto,
    user: JwtSystemPayload,
  ): Promise<CategoryWithChildren[]> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const activeOnly = query.active === true;
    return this.repository.findRoots(unitId, activeOnly);
  }

  async findFlat(user: JwtSystemPayload): Promise<(Category & { depth: number })[]> {
    const unitId = await this.tenancy.resolveUnitId(user);
    return this.repository.findFlat(unitId);
  }

  async findById(id: string, user: JwtSystemPayload): Promise<CategoryWithChildren> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const category = await this.repository.findById(id, unitId);

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    user: JwtSystemPayload,
  ): Promise<CategoryWithChildren> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const category = await this.findById(id, user);

    // Verificar unicidade de nome se o nome mudou
    if (dto.name !== undefined && dto.name !== category.name) {
      const existing = await this.repository.findByName(
        dto.name,
        category.parent_id,
        unitId,
      );

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Já existe uma categoria com o nome "${dto.name}" neste nível.`,
        );
      }
    }

    // Re-slug se o nome mudou
    let newSlug: string | undefined;

    if (dto.name !== undefined && dto.name !== category.name) {
      let slug = slugify(dto.name);
      let suffix = 2;

      while (true) {
        const conflict = await this.repository.findBySlug(slug, category.parent_id, unitId);
        if (!conflict || conflict.id === id) break;
        slug = `${slugify(dto.name)}-${suffix}`;
        suffix++;
      }

      newSlug = slug;
    }

    const { parent_id: _ignored, ...updateFields } = dto;

    await this.repository.update(id, {
      ...updateFields,
      ...(newSlug !== undefined ? { slug: newSlug } : {}),
    });

    return this.repository.findById(id, unitId) as Promise<CategoryWithChildren>;
  }

  async delete(id: string, user: JwtSystemPayload): Promise<void> {
    const category = await this.findById(id, user);

    if (category.children.length > 0) {
      throw new ConflictException(
        'Esta categoria possui subcategorias. Remova-as antes de excluir.',
      );
    }

    const productCount = await this.repository.countProducts(id);

    if (productCount > 0) {
      throw new ConflictException(
        `Esta categoria possui ${productCount} produto(s) vinculado(s). Remova os vínculos antes de excluir.`,
      );
    }

    await this.repository.delete(id);
  }

  async reorder(dto: ReorderCategoriesDto, user: JwtSystemPayload): Promise<void> {
    const unitId = await this.tenancy.resolveUnitId(user);

    // Verificar que todos os IDs pertencem à unidade antes de reordenar
    const ids = dto.updates.map((u) => u.id);
    const checks = await Promise.all(ids.map((id) => this.repository.findById(id, unitId)));
    const missing = ids.filter((id, i) => checks[i] === null);

    if (missing.length > 0) {
      throw new NotFoundException(
        `Categoria(s) não encontrada(s) ou sem permissão: ${missing.join(', ')}`,
      );
    }

    await this.repository.reorder(dto.updates);
  }
}
