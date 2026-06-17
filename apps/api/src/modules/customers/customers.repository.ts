import { Injectable } from '@nestjs/common';
import {
  Customer,
  CustomerAuditAction,
  CustomerAuditLog,
  CustomerFieldDefinition,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CustomerPage {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}

export interface CustomerSearchFilters {
  /** pg_trgm similarity search on nome */
  q?: string;
  /** prefix search on telefone_principal (digits) */
  telefoneDigits?: string;
  /** exact match on cpf_cnpj_hash */
  cpfCnpjHash?: string;
  /** case-insensitive email match */
  email?: string;
  ativo?: boolean;
}

export interface AuditLogInput {
  customerId: string;
  acao: CustomerAuditAction;
  usuarioId: string;
  ipOrigem?: string;
  detalhe?: string;
}

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Field Definitions ───────────────────────────────────────────────────────

  findAllFieldDefinitions(unitId: string): Promise<CustomerFieldDefinition[]> {
    return this.prisma.customerFieldDefinition.findMany({
      where: { unidade_id: unitId },
      orderBy: { ordem: 'asc' },
    });
  }

  findActiveFieldDefinitions(unitId: string): Promise<CustomerFieldDefinition[]> {
    return this.prisma.customerFieldDefinition.findMany({
      where: { unidade_id: unitId, ativo: true },
      orderBy: { ordem: 'asc' },
    });
  }

  findFieldDefinitionById(id: string, unitId: string): Promise<CustomerFieldDefinition | null> {
    return this.prisma.customerFieldDefinition.findFirst({
      where: { id, unidade_id: unitId },
    });
  }

  findFieldDefinitionByNomeCampo(
    nomeCampo: string,
    unitId: string,
  ): Promise<CustomerFieldDefinition | null> {
    return this.prisma.customerFieldDefinition.findUnique({
      where: { unidade_id_nome_campo: { unidade_id: unitId, nome_campo: nomeCampo } },
    });
  }

  findFieldDefinitionByOrdem(
    ordem: number,
    unitId: string,
    excludeId?: string,
  ): Promise<CustomerFieldDefinition | null> {
    return this.prisma.customerFieldDefinition.findFirst({
      where: {
        unidade_id: unitId,
        ordem,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  createFieldDefinition(
    data: Omit<Prisma.CustomerFieldDefinitionCreateInput, 'unit'> & { unidade_id: string },
  ): Promise<CustomerFieldDefinition> {
    const { unidade_id, ...rest } = data;
    return this.prisma.customerFieldDefinition.create({
      data: {
        ...rest,
        unit: { connect: { id: unidade_id } },
      },
    });
  }

  updateFieldDefinition(
    id: string,
    data: Prisma.CustomerFieldDefinitionUpdateInput,
  ): Promise<CustomerFieldDefinition> {
    return this.prisma.customerFieldDefinition.update({ where: { id }, data });
  }

  deactivateFieldDefinition(id: string): Promise<CustomerFieldDefinition> {
    return this.prisma.customerFieldDefinition.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async reorderFieldDefinitions(
    items: Array<{ id: string; ordem: number }>,
  ): Promise<void> {
    await this.prisma.$transaction(
      items.map(({ id, ordem }) =>
        this.prisma.customerFieldDefinition.update({ where: { id }, data: { ordem } }),
      ),
    );
  }

  // ─── Customers ───────────────────────────────────────────────────────────────

  async findAll(
    unitId: string,
    filters: CustomerSearchFilters,
    pagination: { page: number; limit: number },
  ): Promise<CustomerPage> {
    const skip = (pagination.page - 1) * pagination.limit;

    // When a full-text/trgm search is needed, fall back to $queryRaw
    if (filters.q) {
      return this.findByNameTrgm(unitId, filters.q, filters.ativo, pagination);
    }

    const where: Prisma.CustomerWhereInput = {
      unidade_id: unitId,
      deleted_at: null,
    };

    if (filters.ativo !== undefined) {
      where.ativo = filters.ativo;
    }

    if (filters.telefoneDigits) {
      where.telefone_principal = { startsWith: filters.telefoneDigits };
    }

    if (filters.cpfCnpjHash) {
      where.cpf_cnpj_hash = filters.cpfCnpjHash;
    }

    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  private async findByNameTrgm(
    unitId: string,
    q: string,
    ativo: boolean | undefined,
    pagination: { page: number; limit: number },
  ): Promise<CustomerPage> {
    const skip = pagination.page - 1;
    const take = pagination.limit;
    const atvFilter = ativo !== undefined ? ativo : null;

    // Using pg_trgm similarity. The extension must be enabled in the DB.
    const rows = await this.prisma.$queryRaw<Array<Customer & { _count: bigint }>>`
      SELECT *, COUNT(*) OVER() AS "_count"
      FROM customers
      WHERE unidade_id = ${unitId}
        AND deleted_at IS NULL
        AND (${atvFilter}::boolean IS NULL OR ativo = ${atvFilter}::boolean)
        AND (
          similarity(nome, ${q}) > 0.3
          OR nome ILIKE ${'%' + q + '%'}
        )
      ORDER BY similarity(nome, ${q}) DESC, nome ASC
      LIMIT ${take} OFFSET ${skip * take}
    `;

    const total = rows.length > 0 ? Number(rows[0]._count) : 0;
    const data = rows.map(({ _count: _c, ...rest }) => rest as Customer);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  findById(id: string, unitId: string): Promise<Customer | null> {
    return this.prisma.customer.findFirst({
      where: { id, unidade_id: unitId, deleted_at: null },
    });
  }

  createCustomer(
    data: Omit<Prisma.CustomerCreateInput, 'unit'> & { unidade_id: string },
  ): Promise<Customer> {
    const { unidade_id, ...rest } = data;
    return this.prisma.customer.create({
      data: {
        ...rest,
        unit: { connect: { id: unidade_id } },
      },
    });
  }

  updateCustomer(id: string, unitId: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return this.prisma.customer.update({ where: { id, unidade_id: unitId }, data });
  }

  anonymizeCustomer(id: string, unitId: string): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id, unidade_id: unitId },
      data: {
        nome: '[ANONIMIZADO]',
        telefone_principal: '[ANONIMIZADO]',
        email: null,
        cpf_cnpj_enc: null,
        cpf_cnpj_hash: null,
        data_nascimento_enc: null,
        dados_dinamicos: Prisma.DbNull,
        ativo: false,
        deleted_at: new Date(),
      },
    });
  }

  // ─── Audit Log ───────────────────────────────────────────────────────────────

  createAuditLog(input: AuditLogInput): Promise<CustomerAuditLog> {
    return this.prisma.customerAuditLog.create({
      data: {
        customer_id: input.customerId,
        acao: input.acao,
        usuario_id: input.usuarioId,
        ip_origem: input.ipOrigem,
        detalhe: input.detalhe,
      },
    });
  }
}
