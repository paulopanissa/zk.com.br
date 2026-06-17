import { Injectable } from '@nestjs/common';
import {
  CompanyAddress,
  CompanyEmail,
  CompanyPhone,
  CompanySettings,
  RegimeTributario,
  TipoDocumento,
  TipoEmailEmpresa,
  TipoEnderecoEmpresa,
  TipoTelefoneEmpresa,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CompanySettingsWithRelations = CompanySettings & {
  emails: CompanyEmail[];
  phones: CompanyPhone[];
  addresses: CompanyAddress[];
};

export interface UpsertCompanySettingsData {
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj_cpf: string;
  tipo_documento: TipoDocumento;
  regime_tributario: RegimeTributario;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  site_url?: string | null;
  dpo_email?: string | null;
}

export interface CreateEmailData {
  tipo: TipoEmailEmpresa;
  email: string;
  principal?: boolean;
}

export interface UpdateEmailData {
  tipo?: TipoEmailEmpresa;
  email?: string;
  principal?: boolean;
}

export interface CreatePhoneData {
  tipo: TipoTelefoneEmpresa;
  ddi?: string;
  numero: string;
  principal?: boolean;
}

export interface UpdatePhoneData {
  tipo?: TipoTelefoneEmpresa;
  ddi?: string;
  numero?: string;
  principal?: boolean;
}

export interface CreateAddressData {
  tipo: TipoEnderecoEmpresa;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  codigo_ibge?: string | null;
  principal?: boolean;
}

export interface UpdateAddressData {
  tipo?: TipoEnderecoEmpresa;
  logradouro?: string;
  numero?: string;
  complemento?: string | null;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  codigo_ibge?: string | null;
  principal?: boolean;
}

@Injectable()
export class CompanySettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSettings(): Promise<CompanySettingsWithRelations | null> {
    return this.prisma.companySettings.findUnique({
      where: { singleton_key: 'SINGLETON' },
      include: {
        emails: true,
        phones: true,
        addresses: true,
      },
    });
  }

  upsert(data: UpsertCompanySettingsData): Promise<CompanySettings> {
    return this.prisma.companySettings.upsert({
      where: { singleton_key: 'SINGLETON' },
      create: {
        singleton_key: 'SINGLETON',
        ...data,
      },
      update: data,
    });
  }

  // ─── Email ────────────────────────────────────────────────────────────────

  findEmailById(id: string): Promise<CompanyEmail | null> {
    return this.prisma.companyEmail.findUnique({ where: { id } });
  }

  createEmail(company_settings_id: string, data: CreateEmailData): Promise<CompanyEmail> {
    return this.prisma.companyEmail.create({
      data: {
        company_settings_id,
        tipo: data.tipo,
        email: data.email,
        principal: data.principal ?? false,
      },
    });
  }

  updateEmail(id: string, data: UpdateEmailData): Promise<CompanyEmail> {
    return this.prisma.companyEmail.update({ where: { id }, data });
  }

  async deleteEmail(id: string): Promise<void> {
    await this.prisma.companyEmail.delete({ where: { id } });
  }

  countDpoEmails(company_settings_id: string): Promise<number> {
    return this.prisma.companyEmail.count({
      where: {
        company_settings_id,
        tipo: TipoEmailEmpresa.DPO,
      },
    });
  }

  /**
   * Clears the `principal` flag on all emails of the company except the given id.
   * Used inside a transaction when setting a new principal email.
   */
  clearPrincipalEmails(
    company_settings_id: string,
    exceptId?: string,
  ): Promise<{ count: number }> {
    return this.prisma.companyEmail.updateMany({
      where: {
        company_settings_id,
        principal: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { principal: false },
    });
  }

  // ─── Phone ────────────────────────────────────────────────────────────────

  findPhoneById(id: string): Promise<CompanyPhone | null> {
    return this.prisma.companyPhone.findUnique({ where: { id } });
  }

  createPhone(company_settings_id: string, data: CreatePhoneData): Promise<CompanyPhone> {
    return this.prisma.companyPhone.create({
      data: {
        company_settings_id,
        tipo: data.tipo,
        ddi: data.ddi ?? '+55',
        numero: data.numero,
        principal: data.principal ?? false,
      },
    });
  }

  updatePhone(id: string, data: UpdatePhoneData): Promise<CompanyPhone> {
    return this.prisma.companyPhone.update({ where: { id }, data });
  }

  async deletePhone(id: string): Promise<void> {
    await this.prisma.companyPhone.delete({ where: { id } });
  }

  /**
   * Clears the `principal` flag on all phones of the company except the given id.
   */
  clearPrincipalPhones(
    company_settings_id: string,
    exceptId?: string,
  ): Promise<{ count: number }> {
    return this.prisma.companyPhone.updateMany({
      where: {
        company_settings_id,
        principal: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { principal: false },
    });
  }

  // ─── Address ──────────────────────────────────────────────────────────────

  findAddressById(id: string): Promise<CompanyAddress | null> {
    return this.prisma.companyAddress.findUnique({ where: { id } });
  }

  createAddress(company_settings_id: string, data: CreateAddressData): Promise<CompanyAddress> {
    return this.prisma.companyAddress.create({
      data: {
        company_settings_id,
        tipo: data.tipo,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento ?? null,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
        codigo_ibge: data.codigo_ibge ?? null,
        principal: data.principal ?? false,
      },
    });
  }

  updateAddress(id: string, data: UpdateAddressData): Promise<CompanyAddress> {
    return this.prisma.companyAddress.update({ where: { id }, data });
  }

  async deleteAddress(id: string): Promise<void> {
    await this.prisma.companyAddress.delete({ where: { id } });
  }

  countMatrizAddresses(company_settings_id: string): Promise<number> {
    return this.prisma.companyAddress.count({
      where: {
        company_settings_id,
        tipo: TipoEnderecoEmpresa.MATRIZ,
      },
    });
  }

  /**
   * Clears the `principal` flag on all addresses of the company except the given id.
   */
  clearPrincipalAddresses(
    company_settings_id: string,
    exceptId?: string,
  ): Promise<{ count: number }> {
    return this.prisma.companyAddress.updateMany({
      where: {
        company_settings_id,
        principal: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { principal: false },
    });
  }
}
