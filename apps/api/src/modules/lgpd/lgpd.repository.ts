import { Injectable } from '@nestjs/common';
import {
  CustomerAuditAction,
  CustomerAuditLog,
  LgpdDataRequest,
  LgpdRequestStatus,
  LgpdRequestType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface LgpdRequestPage {
  data: LgpdDataRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface LgpdRequestFilters {
  status?: LgpdRequestStatus;
  tipo?: LgpdRequestType;
  customerId?: string;
}

@Injectable()
export class LgpdRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    unitId: string,
    filters: LgpdRequestFilters,
    pagination: { page: number; limit: number },
  ): Promise<LgpdRequestPage> {
    const where: Prisma.LgpdDataRequestWhereInput = { unidade_id: unitId };
    if (filters.status) where.status = filters.status;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.customerId) where.customer_id = filters.customerId;

    const skip = (pagination.page - 1) * pagination.limit;

    // Exclude dados_exportados from list view — it can be large JSON
    const [data, total] = await this.prisma.$transaction([
      this.prisma.lgpdDataRequest.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { solicitado_em: 'desc' },
        select: {
          id: true,
          unidade_id: true,
          customer_id: true,
          tipo: true,
          status: true,
          descricao: true,
          solicitado_em: true,
          prazo_legal: true,
          processado_em: true,
          processado_por: true,
          justificativa: true,
          dados_exportados: false,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.lgpdDataRequest.count({ where }),
    ]);

    return {
      data: data as unknown as LgpdDataRequest[],
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  findById(id: string, unitId: string): Promise<LgpdDataRequest | null> {
    return this.prisma.lgpdDataRequest.findFirst({
      where: { id, unidade_id: unitId },
    });
  }

  create(data: {
    unidade_id: string;
    customer_id: string;
    tipo: LgpdRequestType;
    descricao?: string;
    prazo_legal: Date;
  }): Promise<LgpdDataRequest> {
    return this.prisma.lgpdDataRequest.create({
      data: {
        unidade_id: data.unidade_id,
        customer_id: data.customer_id,
        tipo: data.tipo,
        descricao: data.descricao,
        prazo_legal: data.prazo_legal,
      },
    });
  }

  updateStatus(
    id: string,
    unitId: string,
    status: LgpdRequestStatus,
    processadoPor: string,
    justificativa?: string,
    dadosExportados?: Prisma.InputJsonValue,
  ): Promise<LgpdDataRequest> {
    return this.prisma.lgpdDataRequest.update({
      where: { id, unidade_id: unitId },
      data: {
        status,
        processado_em: new Date(),
        processado_por: processadoPor,
        justificativa: justificativa ?? null,
        ...(dadosExportados !== undefined ? { dados_exportados: dadosExportados } : {}),
      },
    });
  }

  async revokeConsent(
    customerId: string,
    unitId: string,
    userId: string,
    ip?: string,
  ): Promise<{ id: string }> {
    const [result] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId, unidade_id: unitId },
        data: {
          consentimento_lgpd: false,
          consentimento_versao: null,
          consentimento_em: null,
        },
        select: { id: true },
      }),
      this.prisma.customerAuditLog.create({
        data: {
          customer_id: customerId,
          acao: CustomerAuditAction.ATUALIZACAO,
          usuario_id: userId,
          ip_origem: ip ?? null,
          detalhe: 'Consentimento LGPD revogado via solicitação formal de titular',
        },
      }),
    ]);
    return result;
  }

  findCustomerInUnit(customerId: string, unitId: string): Promise<{ id: string } | null> {
    return this.prisma.customer.findFirst({
      where: { id: customerId, unidade_id: unitId, deleted_at: null },
      select: { id: true },
    });
  }

  findCustomerAuditLogs(customerId: string, unitId: string): Promise<CustomerAuditLog[]> {
    // Join through customer to enforce unit scope — prevents cross-unit log exposure
    return this.prisma.customerAuditLog.findMany({
      where: {
        customer_id: customerId,
        customer: { unidade_id: unitId },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
