import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CategoryWithChildren = Category & { children: Category[] };

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna todas as categorias raiz (parent_id IS NULL) com seus filhos,
   * ordenadas por sort_order. Opcionalmente filtra apenas as ativas.
   */
  findRoots(unitId: string, activeOnly: boolean): Promise<CategoryWithChildren[]> {
    const where: Prisma.CategoryWhereInput = {
      unidade_id: unitId,
      parent_id: null,
    };

    if (activeOnly) {
      where.active = true;
    }

    return this.prisma.category.findMany({
      where,
      include: {
        children: {
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { sort_order: 'asc' },
    });
  }

  /**
   * Retorna todas as categorias da unidade em lista plana com campo depth:
   * 0 = raiz, 1 = subcategoria.
   */
  async findFlat(unitId: string): Promise<(Category & { depth: number })[]> {
    const roots = await this.prisma.category.findMany({
      where: { unidade_id: unitId, parent_id: null },
      include: {
        children: { orderBy: { sort_order: 'asc' } },
      },
      orderBy: { sort_order: 'asc' },
    });

    const result: (Category & { depth: number })[] = [];

    for (const root of roots) {
      result.push({ ...root, depth: 0 });
      for (const child of root.children) {
        result.push({ ...child, depth: 1 });
      }
    }

    return result;
  }

  /**
   * Busca uma categoria por ID dentro do escopo da unidade, incluindo filhos.
   */
  findById(id: string, unitId: string): Promise<CategoryWithChildren | null> {
    return this.prisma.category.findFirst({
      where: { id, unidade_id: unitId },
      include: {
        children: { orderBy: { sort_order: 'asc' } },
      },
    });
  }

  /**
   * Busca categoria por slug dentro do escopo de unidade + parent_id.
   * parent_id null = categoria raiz.
   */
  findBySlug(slug: string, parentId: string | null, unitId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { slug, parent_id: parentId ?? null, unidade_id: unitId },
    });
  }

  /**
   * Busca categoria por nome (case-insensitive) dentro do escopo de unidade + parent_id.
   */
  findByName(name: string, parentId: string | null, unitId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        parent_id: parentId ?? null,
        unidade_id: unitId,
      },
    });
  }

  /**
   * Retorna todos os filhos diretos de uma categoria.
   */
  findByParentId(parentId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { parent_id: parentId },
      orderBy: { sort_order: 'asc' },
    });
  }

  create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }

  /**
   * Conta produtos vinculados a esta categoria.
   * TODO: implementar quando o módulo de Produtos for criado.
   * Por ora retorna 0 para não bloquear o fluxo de exclusão.
   */
  async countProducts(_id: string): Promise<number> {
    // TODO: descomentar quando o modelo Product existir no schema
    // return this.prisma.product.count({ where: { category_id: _id } });
    return 0;
  }

  /**
   * Reordena um conjunto de categorias em uma única transação.
   */
  async reorder(updates: Array<{ id: string; sort_order: number }>): Promise<void> {
    await this.prisma.$transaction(
      updates.map(({ id, sort_order }) =>
        this.prisma.category.update({ where: { id }, data: { sort_order } }),
      ),
    );
  }
}
