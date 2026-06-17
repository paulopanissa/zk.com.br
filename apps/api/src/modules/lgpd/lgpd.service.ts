import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LgpdDataRequest, LgpdRequestStatus, LgpdRequestType } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { CustomersService } from '../customers/customers.service';
import { CreateLgpdRequestDto } from './dto/create-request.dto';
import { ProcessLgpdRequestDto } from './dto/process-request.dto';
import { QueryLgpdRequestsDto } from './dto/query-requests.dto';
// LgpdRequestStatus values are used as const objects (Prisma pattern), not TS enum namespace
import { LgpdRepository, LgpdRequestPage } from './lgpd.repository';

const PRAZO_LEGAL_DIAS = 15;

export interface LgpdRequestResponse extends LgpdDataRequest {
  /** Computed at runtime — never persisted. True when prazo_legal < now and status is open. */
  prazo_vencido: boolean;
}

export interface LgpdRequestResponsePage extends Omit<LgpdRequestPage, 'data'> {
  data: LgpdRequestResponse[];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isPrazoVencido(req: LgpdDataRequest): boolean {
  return (
    (req.status === LgpdRequestStatus.PENDENTE ||
      req.status === LgpdRequestStatus.EM_PROCESSAMENTO) &&
    req.prazo_legal < new Date()
  );
}

@Injectable()
export class LgpdService {
  constructor(
    private readonly repository: LgpdRepository,
    private readonly tenancy: TenancyService,
    private readonly customersService: CustomersService,
    private readonly crypto: CryptoService,
  ) {}

  async listRequests(
    query: QueryLgpdRequestsDto,
    user: JwtSystemPayload,
  ): Promise<LgpdRequestResponsePage> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const page = await this.repository.findAll(
      unitId,
      { status: query.status, tipo: query.tipo, customerId: query.customer_id },
      { page: query.page ?? 1, limit: query.limit ?? 20 },
    );
    return {
      ...page,
      data: page.data.map((r) => ({ ...r, prazo_vencido: isPrazoVencido(r) })),
    };
  }

  async createRequest(
    dto: CreateLgpdRequestDto,
    user: JwtSystemPayload,
  ): Promise<LgpdRequestResponse> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const customer = await this.repository.findCustomerInUnit(dto.customer_id, unitId);
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado nesta unidade');
    }

    const now = new Date();
    const request = await this.repository.create({
      unidade_id: unitId,
      customer_id: dto.customer_id,
      tipo: dto.tipo,
      descricao: dto.descricao,
      prazo_legal: addDays(now, PRAZO_LEGAL_DIAS),
    });

    return { ...request, prazo_vencido: false };
  }

  async getRequest(id: string, user: JwtSystemPayload): Promise<LgpdRequestResponse> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const request = await this.repository.findById(id, unitId);
    if (!request) {
      throw new NotFoundException('Solicitação LGPD não encontrada');
    }
    let dados_exportados = request.dados_exportados;
    // Decrypt PII payload stored as { encrypted: cipherText }
    if (
      dados_exportados !== null &&
      typeof dados_exportados === 'object' &&
      !Array.isArray(dados_exportados) &&
      'encrypted' in (dados_exportados as Record<string, unknown>)
    ) {
      const plaintext = this.crypto.decrypt(
        (dados_exportados as Record<string, string>).encrypted,
      );
      dados_exportados = JSON.parse(plaintext) as typeof dados_exportados;
    }
    return { ...request, dados_exportados, prazo_vencido: isPrazoVencido(request) };
  }

  async processRequest(
    id: string,
    dto: ProcessLgpdRequestDto,
    user: JwtSystemPayload,
    ip?: string,
  ): Promise<LgpdRequestResponse> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const request = await this.repository.findById(id, unitId);
    if (!request) {
      throw new NotFoundException('Solicitação LGPD não encontrada');
    }

    if (
      request.status === LgpdRequestStatus.CONCLUIDA ||
      request.status === LgpdRequestStatus.REJEITADA
    ) {
      throw new UnprocessableEntityException('Solicitação já foi processada');
    }

    if (dto.status === LgpdRequestStatus.REJEITADA && !dto.justificativa?.trim()) {
      throw new UnprocessableEntityException(
        'Justificativa obrigatória para rejeitar uma solicitação',
      );
    }

    let dadosExportados: import('@prisma/client').Prisma.InputJsonValue | undefined =
      undefined;

    if (dto.status === LgpdRequestStatus.CONCLUIDA) {
      switch (request.tipo) {
        case LgpdRequestType.EXPORTACAO: {
          // Compile decrypted customer data + audit log, then encrypt before persisting
          const customerData = await this.customersService.exportCustomer(
            request.customer_id,
            user,
            ip,
          );
          const auditLogs = await this.repository.findCustomerAuditLogs(
            request.customer_id,
            unitId,
          );
          const payload = {
            exportado_em: new Date().toISOString(),
            solicitado_por: user.sub,
            cliente: customerData,
            historico_auditoria: auditLogs,
          };
          // Encrypt PII payload at rest — decrypted only on GET /requests/:id
          dadosExportados = { encrypted: this.crypto.encrypt(JSON.stringify(payload)) };
          break;
        }

        case LgpdRequestType.EXCLUSAO: {
          // Idempotent: skip if customer already anonymized (deleted_at set)
          const stillActive = await this.repository.findCustomerInUnit(
            request.customer_id,
            unitId,
          );
          if (stillActive) {
            await this.customersService.deleteCustomer(request.customer_id, user, ip);
          }
          break;
        }

        case LgpdRequestType.REVOGACAO_CONSENTIMENTO: {
          await this.repository.revokeConsent(request.customer_id, unitId, user.sub, ip);
          break;
        }

        case LgpdRequestType.RETIFICACAO:
          // Retificação is operational — data is corrected via PATCH /customers/:id
          break;
      }
    }

    const updated = await this.repository.updateStatus(
      id,
      unitId,
      dto.status,
      user.sub,
      dto.justificativa,
      dadosExportados,
    );

    return { ...updated, prazo_vencido: isPrazoVencido(updated) };
  }
}
