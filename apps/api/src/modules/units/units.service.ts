import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, TipoUnidade, UnitAddress, UnitConfig } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { validateCnpj } from '../../common/validators/cnpj-cpf.validator';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitConfigDto } from './dto/update-unit-config.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UpsertUnitAddressDto } from './dto/upsert-unit-address.dto';
import { CreateUnitData, UnitsRepository, UnitWithRelations } from './units.repository';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class UnitsService {
  constructor(
    private readonly repository: UnitsRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Obtém o ID do CompanySettings singleton.
   * CompanySettings é obrigatório para criar/listar unidades — garante que a empresa foi configurada.
   */
  async getCompanySettingsId(): Promise<string> {
    const settings = await this.prisma.companySettings.findFirst();

    if (!settings) {
      throw new NotFoundException(
        'Configurações da empresa não encontradas. Configure a empresa antes de criar unidades.',
      );
    }

    return settings.id;
  }

  private validateCnpjInscricao(value: string | undefined): void {
    if (value && value.length === 14 && !validateCnpj(value)) {
      throw new UnprocessableEntityException('cnpj_inscricao: CNPJ inválido (dígito verificador incorreto)');
    }
  }

  async create(dto: CreateUnitDto): Promise<UnitWithRelations> {
    this.validateCnpjInscricao(dto.cnpj_inscricao);
    const companySettingsId = await this.getCompanySettingsId();

    let slug = slugify(dto.nome);
    let suffix = 2;

    while (await this.repository.existsSlug(slug)) {
      slug = `${slugify(dto.nome)}-${suffix}`;
      suffix++;
    }

    if (dto.tipo === TipoUnidade.MATRIZ) {
      const count = await this.repository.countActiveMatriz(companySettingsId);

      if (count > 0) {
        throw new ConflictException(
          'Já existe uma unidade MATRIZ ativa. Só pode haver uma MATRIZ.',
        );
      }
    }

    const unit = await this.repository.create({
      nome: dto.nome,
      slug,
      tipo: dto.tipo,
      cnpj_inscricao: dto.cnpj_inscricao ?? null,
      permite_venda_offline: dto.permite_venda_offline ?? false,
      company_settings_id: companySettingsId,
    });

    // Return with relations by re-fetching (create returns plain Unit; we need address + config)
    return this.repository.findById(unit.id) as Promise<UnitWithRelations>;
  }

  async findAll(includeInactive = false): Promise<UnitWithRelations[]> {
    const companySettingsId = await this.getCompanySettingsId();
    return this.repository.findAll(companySettingsId, includeInactive);
  }

  async findById(id: string): Promise<UnitWithRelations> {
    const companySettingsId = await this.getCompanySettingsId();
    const unit = await this.repository.findByIdScoped(id, companySettingsId);

    if (!unit) {
      throw new NotFoundException('Unidade não encontrada');
    }

    return unit;
  }

  async update(id: string, dto: UpdateUnitDto): Promise<UnitWithRelations> {
    this.validateCnpjInscricao(dto.cnpj_inscricao);
    const unit = await this.findById(id);
    const companySettingsId = await this.getCompanySettingsId();

    if (dto.tipo === TipoUnidade.MATRIZ && unit.tipo !== TipoUnidade.MATRIZ) {
      const count = await this.repository.countActiveMatriz(companySettingsId);

      if (count > 0) {
        throw new ConflictException(
          'Já existe uma unidade MATRIZ ativa. Só pode haver uma MATRIZ.',
        );
      }
    }

    const updateData: Prisma.UnitUpdateInput = { ...dto };

    // Re-slug if nome changed, unless caller provided an explicit slug
    if (dto.nome !== undefined && dto.nome !== unit.nome && dto.slug === undefined) {
      let slug = slugify(dto.nome);
      let suffix = 2;

      while (await this.repository.existsSlug(slug, id)) {
        slug = `${slugify(dto.nome)}-${suffix}`;
        suffix++;
      }

      updateData.slug = slug;
    }

    // Validate explicit slug uniqueness
    if (dto.slug !== undefined && dto.slug !== unit.slug) {
      const slugTaken = await this.repository.existsSlug(dto.slug, id);

      if (slugTaken) {
        throw new ConflictException(`O slug '${dto.slug}' já está em uso por outra unidade.`);
      }
    }

    await this.repository.update(id, updateData);
    return this.repository.findById(id) as Promise<UnitWithRelations>;
  }

  async deactivate(id: string): Promise<void> {
    const unit = await this.findById(id);

    if (unit.tipo === TipoUnidade.MATRIZ) {
      throw new ConflictException('Não é possível desativar uma unidade MATRIZ');
    }

    // TODO: verificar caixa aberto quando módulo PDV existir

    await this.repository.deactivate(id);
  }

  async upsertAddress(id: string, dto: UpsertUnitAddressDto): Promise<UnitAddress> {
    await this.findById(id);
    return this.repository.upsertAddress(id, dto);
  }

  async getConfig(id: string): Promise<UnitConfig> {
    await this.findById(id);

    const config = await this.repository.findConfig(id);

    if (!config) {
      throw new NotFoundException('Configuração da unidade não encontrada');
    }

    return config;
  }

  async updateConfig(id: string, dto: UpdateUnitConfigDto): Promise<UnitConfig> {
    await this.findById(id);
    return this.repository.updateConfig(id, dto);
  }
}
