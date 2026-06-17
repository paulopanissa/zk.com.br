import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Customer,
  CustomerAuditAction,
  CustomerFieldDefinition,
  CustomerFieldType,
  Prisma,
} from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { CustomersRepository } from './customers.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateFieldDefinitionDto } from './dto/create-field-definition.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { ReorderFieldsDto } from './dto/reorder-fields.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateFieldDefinitionDto } from './dto/update-field-definition.dto';
import { extractDigits, validateCpfCnpj } from './utils/cpf-cnpj.validator';

/** Safe customer response — never exposes encrypted fields or internal hashes. */
export interface CustomerResponse extends Omit<Customer, 'cpf_cnpj_enc' | 'data_nascimento_enc' | 'cpf_cnpj_hash'> {
  cpf_cnpj?: string | null;
  data_nascimento?: string | null;
}

export interface CustomerResponsePage {
  data: CustomerResponse[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly repository: CustomersRepository,
    private readonly tenancy: TenancyService,
    private readonly crypto: CryptoService,
  ) {}

  // ─── Field Definitions ───────────────────────────────────────────────────────

  async listFieldDefinitions(user: JwtSystemPayload): Promise<CustomerFieldDefinition[]> {
    const unitId = await this.tenancy.resolveUnitId(user);
    return this.repository.findAllFieldDefinitions(unitId);
  }

  async createFieldDefinition(
    dto: CreateFieldDefinitionDto,
    user: JwtSystemPayload,
  ): Promise<CustomerFieldDefinition> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const existing = await this.repository.findFieldDefinitionByNomeCampo(dto.nome_campo, unitId);
    if (existing) {
      throw new ConflictException(
        `Já existe um campo com o nome "${dto.nome_campo}" nesta unidade`,
      );
    }

    const ordemTaken = await this.repository.findFieldDefinitionByOrdem(dto.ordem, unitId);
    if (ordemTaken) {
      throw new ConflictException(`A ordem ${dto.ordem} já está ocupada por outro campo`);
    }

    if (dto.validacao_regex !== undefined) {
      this.assertRegexSafe(dto.validacao_regex);
    }

    return this.repository.createFieldDefinition({
      unidade_id: unitId,
      nome_campo: dto.nome_campo,
      label: dto.label,
      tipo: dto.tipo,
      obrigatorio: dto.obrigatorio ?? false,
      validacao_regex: dto.validacao_regex ?? null,
      opcoes: dto.opcoes ? (dto.opcoes as unknown as Prisma.InputJsonValue) : undefined,
      ordem: dto.ordem,
    });
  }

  async updateFieldDefinition(
    id: string,
    dto: UpdateFieldDefinitionDto,
    user: JwtSystemPayload,
  ): Promise<CustomerFieldDefinition> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const field = await this.repository.findFieldDefinitionById(id, unitId);
    if (!field) {
      throw new NotFoundException('Campo não encontrado');
    }

    if (dto.ordem !== undefined && dto.ordem !== field.ordem) {
      const ordemTaken = await this.repository.findFieldDefinitionByOrdem(dto.ordem, unitId, id);
      if (ordemTaken) {
        throw new ConflictException(`A ordem ${dto.ordem} já está ocupada por outro campo`);
      }
    }

    if (dto.validacao_regex !== undefined) {
      this.assertRegexSafe(dto.validacao_regex);
    }

    const updateData: Prisma.CustomerFieldDefinitionUpdateInput = {};
    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.obrigatorio !== undefined) updateData.obrigatorio = dto.obrigatorio;
    if (dto.validacao_regex !== undefined) updateData.validacao_regex = dto.validacao_regex;
    if (dto.opcoes !== undefined)
      updateData.opcoes = dto.opcoes as unknown as Prisma.InputJsonValue;
    if (dto.ordem !== undefined) updateData.ordem = dto.ordem;
    if (dto.ativo !== undefined) updateData.ativo = dto.ativo;

    return this.repository.updateFieldDefinition(id, updateData);
  }

  async deactivateFieldDefinition(id: string, user: JwtSystemPayload): Promise<void> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const field = await this.repository.findFieldDefinitionById(id, unitId);
    if (!field) {
      throw new NotFoundException('Campo não encontrado');
    }
    await this.repository.deactivateFieldDefinition(id);
  }

  async reorderFieldDefinitions(dto: ReorderFieldsDto, user: JwtSystemPayload): Promise<void> {
    const unitId = await this.tenancy.resolveUnitId(user);

    // Ensure all IDs belong to this unit before batch update
    for (const item of dto.fields) {
      const field = await this.repository.findFieldDefinitionById(item.id, unitId);
      if (!field) {
        throw new NotFoundException(`Campo ${item.id} não encontrado nesta unidade`);
      }
    }

    await this.repository.reorderFieldDefinitions(dto.fields);
  }

  // ─── Customers ───────────────────────────────────────────────────────────────

  async listCustomers(query: QueryCustomerDto, user: JwtSystemPayload): Promise<CustomerResponsePage> {
    const unitId = await this.tenancy.resolveUnitId(user);

    let cpfCnpjHash: string | undefined;
    if (query.cpf_cnpj) {
      const digits = extractDigits(query.cpf_cnpj);
      cpfCnpjHash = this.crypto.hashForSearch(digits);
    }

    let telefoneDigits: string | undefined;
    if (query.telefone) {
      telefoneDigits = extractDigits(query.telefone);
    }

    const page = await this.repository.findAll(
      unitId,
      {
        q: query.q,
        telefoneDigits,
        cpfCnpjHash,
        email: query.email,
        ativo: query.ativo,
      },
      { page: query.page ?? 1, limit: query.limit ?? 20 },
    );

    return { ...page, data: page.data.map((c) => this.toResponse(c)) };
  }

  async createCustomer(
    dto: CreateCustomerDto,
    user: JwtSystemPayload,
    ip?: string,
  ): Promise<CustomerResponse> {
    const unitId = await this.tenancy.resolveUnitId(user);

    // LGPD consent required
    if (!dto.consentimento_lgpd) {
      throw new UnprocessableEntityException(
        'O consentimento LGPD é obrigatório para criar um cliente',
      );
    }

    // Validate and encrypt CPF/CNPJ
    let cpfCnpjEnc: string | undefined;
    let cpfCnpjHash: string | undefined;
    if (dto.cpf_cnpj) {
      const digits = extractDigits(dto.cpf_cnpj);
      if (!validateCpfCnpj(digits)) {
        throw new UnprocessableEntityException('CPF/CNPJ inválido');
      }
      cpfCnpjEnc = this.crypto.encrypt(digits);
      cpfCnpjHash = this.crypto.hashForSearch(digits);
    }

    // Encrypt date of birth
    let dataNascimentoEnc: string | undefined;
    if (dto.data_nascimento) {
      dataNascimentoEnc = this.crypto.encrypt(dto.data_nascimento);
    }

    // Validate dynamic fields
    const fieldDefs = await this.repository.findActiveFieldDefinitions(unitId);
    const validatedDados = await this.validateDynamicFields(
      dto.dados_dinamicos ?? {},
      fieldDefs,
    );

    const customer = await this.repository.createCustomer({
      unidade_id: unitId,
      nome: dto.nome,
      telefone_principal: dto.telefone_principal,
      email: dto.email,
      cpf_cnpj_enc: cpfCnpjEnc,
      cpf_cnpj_hash: cpfCnpjHash,
      data_nascimento_enc: dataNascimentoEnc,
      dados_dinamicos: validatedDados as Prisma.InputJsonValue,
      consentimento_lgpd: dto.consentimento_lgpd,
      consentimento_versao: dto.consentimento_versao,
      consentimento_em: new Date(dto.consentimento_em),
    });

    void this.logAudit(customer.id, CustomerAuditAction.CRIACAO, user.sub, ip);

    return this.toResponse(customer);
  }

  async getCustomerById(
    id: string,
    user: JwtSystemPayload,
    ip?: string,
  ): Promise<CustomerResponse> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const customer = await this.repository.findById(id, unitId);
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    void this.logAudit(id, CustomerAuditAction.LEITURA, user.sub, ip);

    return this.toResponse(customer);
  }

  async updateCustomer(
    id: string,
    dto: UpdateCustomerDto,
    user: JwtSystemPayload,
    ip?: string,
  ): Promise<CustomerResponse> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const customer = await this.repository.findById(id, unitId);
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const updateData: Prisma.CustomerUpdateInput = {};
    const changedFields: string[] = [];

    if (dto.nome !== undefined) {
      updateData.nome = dto.nome;
      changedFields.push('nome');
    }

    if (dto.telefone_principal !== undefined) {
      updateData.telefone_principal = dto.telefone_principal;
      changedFields.push('telefone_principal');
    }

    if (dto.email !== undefined) {
      updateData.email = dto.email;
      changedFields.push('email');
    }

    if (dto.cpf_cnpj !== undefined) {
      const digits = extractDigits(dto.cpf_cnpj);
      if (!validateCpfCnpj(digits)) {
        throw new UnprocessableEntityException('CPF/CNPJ inválido');
      }
      updateData.cpf_cnpj_enc = this.crypto.encrypt(digits);
      updateData.cpf_cnpj_hash = this.crypto.hashForSearch(digits);
      changedFields.push('cpf_cnpj');
    }

    if (dto.data_nascimento !== undefined) {
      updateData.data_nascimento_enc = this.crypto.encrypt(dto.data_nascimento);
      changedFields.push('data_nascimento');
    }

    if (dto.dados_dinamicos !== undefined) {
      const fieldDefs = await this.repository.findActiveFieldDefinitions(unitId);
      const validated = await this.validateDynamicFields(dto.dados_dinamicos, fieldDefs);
      updateData.dados_dinamicos = validated as Prisma.InputJsonValue;
      changedFields.push('dados_dinamicos');
    }

    if (dto.ativo !== undefined) {
      updateData.ativo = dto.ativo;
      changedFields.push('ativo');
    }

    const updated = await this.repository.updateCustomer(id, unitId, updateData);

    void this.logAudit(
      id,
      CustomerAuditAction.ATUALIZACAO,
      user.sub,
      ip,
      changedFields.join(', '),
    );

    return this.toResponse(updated);
  }

  async deleteCustomer(id: string, user: JwtSystemPayload, ip?: string): Promise<void> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const customer = await this.repository.findById(id, unitId);
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    await this.repository.anonymizeCustomer(id, unitId);

    void this.logAudit(id, CustomerAuditAction.EXCLUSAO, user.sub, ip);
  }

  async exportCustomer(
    id: string,
    user: JwtSystemPayload,
    ip?: string,
  ): Promise<CustomerResponse> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const customer = await this.repository.findById(id, unitId);
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    void this.logAudit(id, CustomerAuditAction.EXPORTACAO, user.sub, ip);

    // exportCustomer decrypts all PII for plaintext export
    return this.toResponse(customer, true);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Converts a Customer DB record to CustomerResponse.
   * By default decryption is skipped (safe view). Set decrypt=true for export.
   * cpf_cnpj_hash is always stripped — internal search key, never exposed to clients.
   * Dynamic fields containing AES ciphertext are masked with "***" in safe view.
   */
  private toResponse(customer: Customer, decrypt = false): CustomerResponse {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cpf_cnpj_enc, data_nascimento_enc, cpf_cnpj_hash: _hash, ...rest } = customer;

    let cpf_cnpj: string | null = null;
    let data_nascimento: string | null = null;

    if (decrypt) {
      if (cpf_cnpj_enc) {
        try {
          cpf_cnpj = this.crypto.decrypt(cpf_cnpj_enc);
        } catch {
          cpf_cnpj = null;
        }
      }
      if (data_nascimento_enc) {
        try {
          data_nascimento = this.crypto.decrypt(data_nascimento_enc);
        } catch {
          data_nascimento = null;
        }
      }
    }

    // Mask any AES-256-GCM ciphertext stored in dados_dinamicos (CPF_CNPJ dynamic fields).
    // Ciphertext format: <ivHex>:<tagHex>:<ciphertextHex> — 3 colon-separated hex segments.
    const CIPHERTEXT_RE = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;
    let dadosDinamicos = rest.dados_dinamicos;
    if (!decrypt && dadosDinamicos && typeof dadosDinamicos === 'object' && !Array.isArray(dadosDinamicos)) {
      const masked: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(dadosDinamicos as Record<string, unknown>)) {
        masked[k] = typeof v === 'string' && CIPHERTEXT_RE.test(v) ? '***' : v;
      }
      dadosDinamicos = masked as unknown as typeof dadosDinamicos;
    }

    return { ...rest, dados_dinamicos: dadosDinamicos, cpf_cnpj, data_nascimento };
  }

  /**
   * Validates dados_dinamicos against active CustomerFieldDefinitions.
   * Handles required fields, regex, SELECT/MULTISELECT options and nested CPF_CNPJ encryption.
   */
  private async validateDynamicFields(
    dados: Record<string, unknown>,
    fieldDefs: CustomerFieldDefinition[],
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = { ...dados };

    for (const def of fieldDefs) {
      const value = dados[def.nome_campo];

      if (def.obrigatorio && (value === undefined || value === null || value === '')) {
        throw new UnprocessableEntityException(
          `Campo obrigatório ausente: ${def.nome_campo} (${def.label})`,
        );
      }

      if (value === undefined || value === null) continue;

      switch (def.tipo) {
        case CustomerFieldType.TEXT: {
          if (def.validacao_regex) {
            const regex = new RegExp(def.validacao_regex);
            if (!regex.test(String(value))) {
              throw new UnprocessableEntityException(
                `Valor inválido para o campo ${def.nome_campo}: não corresponde ao padrão esperado`,
              );
            }
          }
          break;
        }

        case CustomerFieldType.SELECT: {
          const opcoes = (def.opcoes as Array<{ value: string; label: string }> | null) ?? [];
          const allowed = opcoes.map((o) => o.value);
          if (!allowed.includes(String(value))) {
            throw new UnprocessableEntityException(
              `Valor inválido para o campo ${def.nome_campo}. Opções válidas: ${allowed.join(', ')}`,
            );
          }
          break;
        }

        case CustomerFieldType.MULTISELECT: {
          const opcoes = (def.opcoes as Array<{ value: string; label: string }> | null) ?? [];
          const allowed = opcoes.map((o) => o.value);
          const values = Array.isArray(value) ? (value as unknown[]) : [value];
          for (const v of values) {
            if (!allowed.includes(String(v))) {
              throw new UnprocessableEntityException(
                `Valor inválido para o campo ${def.nome_campo}: "${String(v)}". Opções válidas: ${allowed.join(', ')}`,
              );
            }
          }
          break;
        }

        case CustomerFieldType.CPF_CNPJ: {
          const digits = extractDigits(String(value));
          if (!validateCpfCnpj(digits)) {
            throw new UnprocessableEntityException(
              `CPF/CNPJ inválido no campo dinâmico ${def.nome_campo}`,
            );
          }
          // Encrypt the dynamic CPF/CNPJ field
          result[def.nome_campo] = this.crypto.encrypt(digits);
          break;
        }

        default:
          break;
      }
    }

    return result;
  }

  /**
   * Validates a regex pattern is well-formed and tests it against a short string
   * with a 50ms timeout to detect catastrophic backtracking before persisting.
   * Not a full ReDoS solver — guards against obvious mistakes from trusted admins.
   */
  private assertRegexSafe(pattern: string): void {
    let re: RegExp;
    try {
      re = new RegExp(pattern);
    } catch {
      throw new UnprocessableEntityException(`validacao_regex inválida: padrão não compila`);
    }
    // Quick execution test — catastrophic backtracking shows up even on short inputs
    const probe = 'aaaaaaaaaaaaaaaaaaa!';
    const start = Date.now();
    re.test(probe);
    if (Date.now() - start > 50) {
      throw new UnprocessableEntityException(
        `validacao_regex perigosa: padrão pode causar backtracking catastrófico`,
      );
    }
  }

  /** Fire-and-forget audit log — does not block main flow. */
  private logAudit(
    customerId: string,
    acao: CustomerAuditAction,
    usuarioId: string,
    ipOrigem?: string,
    detalhe?: string,
  ): Promise<void> {
    return this.repository
      .createAuditLog({ customerId, acao, usuarioId, ipOrigem, detalhe })
      .then(() => undefined)
      .catch(() => {
        // Swallow audit failures — never block main flow
      });
  }
}
