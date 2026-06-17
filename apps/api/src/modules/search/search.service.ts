import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchEntityType } from './dto/query-search.dto';
import {
  BrandResult,
  CategoryResult,
  CustomerResult,
  ProductResult,
  SearchResults,
  SupplierResult,
} from './types/search-results.type';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(
    q: string,
    unitId: string,
    types: SearchEntityType[],
    limit: number,
  ): Promise<SearchResults> {
    const start = Date.now();

    // Sanitize ILIKE wildcards to prevent degenerate full-scans from user-supplied % and _
    const safeLike = `%${q.replace(/[%_\\]/g, '\\$&')}%`;

    const tasks: Array<[SearchEntityType, Promise<unknown>]> = [];

    if (types.includes(SearchEntityType.PRODUCTS)) {
      tasks.push([SearchEntityType.PRODUCTS, this.searchProducts(q, safeLike, unitId, limit)]);
    }
    if (types.includes(SearchEntityType.CUSTOMERS)) {
      tasks.push([SearchEntityType.CUSTOMERS, this.searchCustomers(q, safeLike, unitId, limit)]);
    }
    if (types.includes(SearchEntityType.SUPPLIERS)) {
      tasks.push([SearchEntityType.SUPPLIERS, this.searchSuppliers(q, safeLike, unitId, limit)]);
    }
    if (types.includes(SearchEntityType.CATEGORIES)) {
      tasks.push([SearchEntityType.CATEGORIES, this.searchCategories(q, safeLike, unitId, limit)]);
    }
    if (types.includes(SearchEntityType.BRANDS)) {
      tasks.push([SearchEntityType.BRANDS, this.searchBrands(q, safeLike, unitId, limit)]);
    }

    const settled = await Promise.allSettled(tasks.map(([, p]) => p));
    const results: SearchResults['results'] = {};

    settled.forEach((outcome, i) => {
      const [type] = tasks[i];
      if (outcome.status === 'fulfilled') {
        (results as Record<string, unknown>)[type] = outcome.value;
      } else {
        // Log and return empty array — one failing sub-query must not kill the whole response
        this.logger.warn(`Search sub-query for "${type}" failed: ${String(outcome.reason)}`);
        (results as Record<string, unknown>)[type] = [];
      }
    });

    return { q, took_ms: Date.now() - start, results };
  }

  private async searchProducts(
    q: string,
    pattern: string,
    unitId: string,
    limit: number,
  ): Promise<ProductResult[]> {
    return this.prisma.$queryRaw<ProductResult[]>`
      SELECT id, name, sku, barcode, active
      FROM products
      WHERE unidade_id = ${unitId}
        AND active = true
        AND (
          similarity(name, ${q}) > 0.3
          OR name ILIKE ${pattern}
          OR sku ILIKE ${pattern}
          OR barcode ILIKE ${pattern}
        )
      ORDER BY similarity(name, ${q}) DESC, name ASC
      LIMIT ${limit}
    `;
  }

  private async searchCustomers(
    q: string,
    pattern: string,
    unitId: string,
    limit: number,
  ): Promise<CustomerResult[]> {
    return this.prisma.$queryRaw<CustomerResult[]>`
      SELECT id, nome, email, ativo
      FROM customers
      WHERE unidade_id = ${unitId}
        AND deleted_at IS NULL
        AND ativo = true
        AND (
          similarity(nome, ${q}) > 0.3
          OR nome ILIKE ${pattern}
          OR email ILIKE ${pattern}
        )
      ORDER BY similarity(nome, ${q}) DESC, nome ASC
      LIMIT ${limit}
    `;
  }

  private async searchSuppliers(
    q: string,
    pattern: string,
    unitId: string,
    limit: number,
  ): Promise<SupplierResult[]> {
    return this.prisma.$queryRaw<SupplierResult[]>`
      SELECT id, razao_social, nome_fantasia, active
      FROM suppliers
      WHERE unidade_id = ${unitId}
        AND active = true
        AND (
          similarity(razao_social, ${q}) > 0.3
          OR razao_social ILIKE ${pattern}
          OR nome_fantasia ILIKE ${pattern}
        )
      ORDER BY similarity(razao_social, ${q}) DESC, razao_social ASC
      LIMIT ${limit}
    `;
  }

  private async searchCategories(
    q: string,
    pattern: string,
    unitId: string,
    limit: number,
  ): Promise<CategoryResult[]> {
    return this.prisma.$queryRaw<CategoryResult[]>`
      SELECT id, name, slug, active
      FROM categories
      WHERE unidade_id = ${unitId}
        AND active = true
        AND (similarity(name, ${q}) > 0.3 OR name ILIKE ${pattern})
      ORDER BY similarity(name, ${q}) DESC, name ASC
      LIMIT ${limit}
    `;
  }

  private async searchBrands(
    q: string,
    pattern: string,
    unitId: string,
    limit: number,
  ): Promise<BrandResult[]> {
    return this.prisma.$queryRaw<BrandResult[]>`
      SELECT id, name, slug, active
      FROM brands
      WHERE unidade_id = ${unitId}
        AND active = true
        AND (similarity(name, ${q}) > 0.3 OR name ILIKE ${pattern})
      ORDER BY similarity(name, ${q}) DESC, name ASC
      LIMIT ${limit}
    `;
  }
}
