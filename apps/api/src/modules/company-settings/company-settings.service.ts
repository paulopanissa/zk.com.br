import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CompanyAddress, CompanyEmail, CompanyPhone, CompanySettings } from '@prisma/client';
import {
  deriveTipoDocumento,
  formatCnpjCpf,
  validateCnpjCpf,
} from '../../common/validators/cnpj-cpf.validator';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanySettingsRepository, CompanySettingsWithRelations } from './company-settings.repository';
import { CreateCompanyAddressDto } from './dto/create-company-address.dto';
import { CreateCompanyEmailDto } from './dto/create-company-email.dto';
import { CreateCompanyPhoneDto } from './dto/create-company-phone.dto';
import { UpdateCompanyAddressDto } from './dto/update-company-address.dto';
import { UpdateCompanyEmailDto } from './dto/update-company-email.dto';
import { UpdateCompanyPhoneDto } from './dto/update-company-phone.dto';
import { UpsertCompanySettingsDto } from './dto/upsert-company-settings.dto';

@Injectable()
export class CompanySettingsService {
  constructor(
    private readonly repository: CompanySettingsRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Settings ─────────────────────────────────────────────────────────────

  async upsertSettings(dto: UpsertCompanySettingsDto): Promise<CompanySettings> {
    const digits = dto.cnpj_cpf.replace(/\D/g, '');

    if (!validateCnpjCpf(digits)) {
      throw new UnprocessableEntityException(
        'CNPJ/CPF inválido: dígito verificador incorreto',
      );
    }

    const tipo_documento = deriveTipoDocumento(digits);

    return this.repository.upsert({
      razao_social: dto.razao_social,
      nome_fantasia: dto.nome_fantasia ?? null,
      cnpj_cpf: digits,
      tipo_documento,
      regime_tributario: dto.regime_tributario,
      inscricao_estadual: dto.inscricao_estadual ?? null,
      inscricao_municipal: dto.inscricao_municipal ?? null,
      site_url: dto.site_url ?? null,
      dpo_email: dto.dpo_email ?? null,
    });
  }

  async getSettings(): Promise<
    (CompanySettings & { emails: CompanyEmail[]; phones: CompanyPhone[]; addresses: CompanyAddress[] }) | null
  > {
    const settings = await this.repository.findSettings();

    if (!settings) return null;

    return {
      ...settings,
      cnpj_cpf: formatCnpjCpf(settings.cnpj_cpf),
    };
  }

  // ─── Emails ───────────────────────────────────────────────────────────────

  async getEmails(): Promise<CompanyEmail[]> {
    const settings = await this.findSettingsOrFail();
    return settings.emails;
  }

  async createEmail(dto: CreateCompanyEmailDto): Promise<CompanyEmail> {
    const settings = await this.findSettingsOrFail();

    if (dto.principal) {
      // Clear other principals in a transaction before creating the new one
      return this.prisma.$transaction(async () => {
        await this.repository.clearPrincipalEmails(settings.id);
        return this.repository.createEmail(settings.id, dto);
      });
    }

    return this.repository.createEmail(settings.id, dto);
  }

  async updateEmail(id: string, dto: UpdateCompanyEmailDto): Promise<CompanyEmail> {
    const settings = await this.findSettingsOrFail();
    const email = await this.findEmailBelongingToCompany(id, settings.id);

    if (dto.principal) {
      return this.prisma.$transaction(async () => {
        await this.repository.clearPrincipalEmails(settings.id, email.id);
        return this.repository.updateEmail(id, dto);
      });
    }

    return this.repository.updateEmail(id, dto);
  }

  async deleteEmail(id: string): Promise<void> {
    const settings = await this.findSettingsOrFail();
    const email = await this.findEmailBelongingToCompany(id, settings.id);

    if (email.tipo === 'DPO') {
      const count = await this.repository.countDpoEmails(settings.id);
      if (count <= 1) {
        throw new ConflictException('Não é possível remover o único e-mail DPO cadastrado');
      }
    }

    await this.repository.deleteEmail(id);
  }

  // ─── Phones ───────────────────────────────────────────────────────────────

  async getPhones(): Promise<CompanyPhone[]> {
    const settings = await this.findSettingsOrFail();
    return settings.phones;
  }

  async createPhone(dto: CreateCompanyPhoneDto): Promise<CompanyPhone> {
    const settings = await this.findSettingsOrFail();

    if (dto.principal) {
      return this.prisma.$transaction(async () => {
        await this.repository.clearPrincipalPhones(settings.id);
        return this.repository.createPhone(settings.id, dto);
      });
    }

    return this.repository.createPhone(settings.id, dto);
  }

  async updatePhone(id: string, dto: UpdateCompanyPhoneDto): Promise<CompanyPhone> {
    const settings = await this.findSettingsOrFail();
    const phone = await this.findPhoneBelongingToCompany(id, settings.id);

    if (dto.principal) {
      return this.prisma.$transaction(async () => {
        await this.repository.clearPrincipalPhones(settings.id, phone.id);
        return this.repository.updatePhone(id, dto);
      });
    }

    return this.repository.updatePhone(id, dto);
  }

  async deletePhone(id: string): Promise<void> {
    const settings = await this.findSettingsOrFail();
    await this.findPhoneBelongingToCompany(id, settings.id);
    await this.repository.deletePhone(id);
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  async getAddresses(): Promise<CompanyAddress[]> {
    const settings = await this.findSettingsOrFail();
    return settings.addresses;
  }

  async createAddress(dto: CreateCompanyAddressDto): Promise<CompanyAddress> {
    const settings = await this.findSettingsOrFail();

    if (dto.principal) {
      return this.prisma.$transaction(async () => {
        await this.repository.clearPrincipalAddresses(settings.id);
        return this.repository.createAddress(settings.id, dto);
      });
    }

    return this.repository.createAddress(settings.id, dto);
  }

  async updateAddress(id: string, dto: UpdateCompanyAddressDto): Promise<CompanyAddress> {
    const settings = await this.findSettingsOrFail();
    const address = await this.findAddressBelongingToCompany(id, settings.id);

    if (dto.principal) {
      return this.prisma.$transaction(async () => {
        await this.repository.clearPrincipalAddresses(settings.id, address.id);
        return this.repository.updateAddress(id, dto);
      });
    }

    return this.repository.updateAddress(id, dto);
  }

  async deleteAddress(id: string): Promise<void> {
    const settings = await this.findSettingsOrFail();
    const address = await this.findAddressBelongingToCompany(id, settings.id);

    if (address.tipo === 'MATRIZ') {
      const count = await this.repository.countMatrizAddresses(settings.id);
      if (count <= 1) {
        throw new ConflictException('Não é possível remover o endereço de MATRIZ');
      }
    }

    await this.repository.deleteAddress(id);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findSettingsOrFail(): Promise<CompanySettingsWithRelations> {
    const settings = await this.repository.findSettings();
    if (!settings) {
      throw new NotFoundException('Configurações da empresa não encontradas');
    }
    return settings;
  }

  private async findEmailBelongingToCompany(
    emailId: string,
    companySettingsId: string,
  ): Promise<CompanyEmail> {
    const email = await this.repository.findEmailById(emailId);
    if (!email || email.company_settings_id !== companySettingsId) {
      throw new NotFoundException('E-mail não encontrado');
    }
    return email;
  }

  private async findPhoneBelongingToCompany(
    phoneId: string,
    companySettingsId: string,
  ): Promise<CompanyPhone> {
    const phone = await this.repository.findPhoneById(phoneId);
    if (!phone || phone.company_settings_id !== companySettingsId) {
      throw new NotFoundException('Telefone não encontrado');
    }
    return phone;
  }

  private async findAddressBelongingToCompany(
    addressId: string,
    companySettingsId: string,
  ): Promise<CompanyAddress> {
    const address = await this.repository.findAddressById(addressId);
    if (!address || address.company_settings_id !== companySettingsId) {
      throw new NotFoundException('Endereço não encontrado');
    }
    return address;
  }
}
