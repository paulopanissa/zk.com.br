import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NcmTaxOverride, TaxProfile, TaxRate, TipoImpostoNcm } from '@prisma/client';
import { CreateNcmOverrideDto } from './dto/create-ncm-override.dto';
import { CreateTaxProfileDto } from './dto/create-tax-profile.dto';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { QueryNcmOverrideDto } from './dto/query-ncm-override.dto';
import { QueryTaxProfileDto } from './dto/query-tax-profile.dto';
import { UpdateNcmOverrideDto } from './dto/update-ncm-override.dto';
import { UpdateTaxProfileDto } from './dto/update-tax-profile.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { Page, TaxConfigRepository, TaxProfileWithRates } from './tax-config.repository';

export interface EffectiveRate {
  imposto: string;
  aliquota_percentual: number;
  /** "ncm_override" when the NCM override took precedence; "profile" when it came from the profile rates */
  source: 'ncm_override' | 'profile';
}

@Injectable()
export class TaxConfigService {
  constructor(private readonly repository: TaxConfigRepository) {}

  // ─── TaxProfile ─────────────────────────────────────────────────────────────

  findAllProfiles(filters: QueryTaxProfileDto): Promise<Page<TaxProfile>> {
    return this.repository.findAllProfiles(filters);
  }

  async findProfileById(id: string): Promise<TaxProfileWithRates> {
    const profile = await this.repository.findProfileById(id);
    if (!profile) {
      throw new NotFoundException('Perfil tributário não encontrado');
    }
    return profile;
  }

  async createProfile(dto: CreateTaxProfileDto): Promise<TaxProfile> {
    if (dto.padrao) {
      await this.assertNoPaddingConflict(dto.regime_tributario);
    }

    return this.repository.createProfile({
      nome: dto.nome,
      regime_tributario: dto.regime_tributario,
      descricao: dto.descricao,
      ativo: dto.ativo ?? true,
      padrao: dto.padrao ?? false,
    });
  }

  async updateProfile(id: string, dto: UpdateTaxProfileDto): Promise<TaxProfile> {
    const existing = await this.findProfileById(id);

    // If setting this profile as default, ensure no other default exists for the same regime
    const regime = dto.regime_tributario ?? existing.regime_tributario;
    const becomingDefault = dto.padrao === true && !existing.padrao;

    if (becomingDefault) {
      await this.assertNoPaddingConflict(regime, id);
    }

    // If changing regime while padrao=true, check the target regime has no default
    if (
      dto.regime_tributario !== undefined &&
      dto.regime_tributario !== existing.regime_tributario &&
      (existing.padrao || dto.padrao === true)
    ) {
      await this.assertNoPaddingConflict(dto.regime_tributario, id);
    }

    return this.repository.updateProfile(id, {
      nome: dto.nome,
      regime_tributario: dto.regime_tributario,
      descricao: dto.descricao,
      ativo: dto.ativo,
      padrao: dto.padrao,
    });
  }

  async deleteProfile(id: string): Promise<void> {
    const profile = await this.findProfileById(id);

    if (profile.padrao) {
      throw new ConflictException(
        'Não é possível excluir o perfil tributário padrão. ' +
          'Defina outro perfil como padrão antes de excluir este.',
      );
    }

    // TaxRate cascade delete is handled by Prisma (onDelete: Cascade in schema)
    await this.repository.deleteProfile(id);
  }

  // ─── TaxRate ─────────────────────────────────────────────────────────────────

  async findRatesByProfileId(profileId: string): Promise<TaxRate[]> {
    // Validates profile existence before returning rates
    await this.findProfileById(profileId);
    return this.repository.findRatesByProfileId(profileId);
  }

  async addRateToProfile(profileId: string, dto: CreateTaxRateDto): Promise<TaxRate> {
    await this.findProfileById(profileId);

    return this.repository.createRate({
      imposto: dto.imposto,
      aliquota_percentual: dto.aliquota_percentual,
      base_calculo: dto.base_calculo,
      incluso_no_preco: dto.incluso_no_preco ?? false,
      uf_origem: dto.uf_origem,
      uf_destino: dto.uf_destino,
      profile: { connect: { id: profileId } },
    });
  }

  async updateRate(profileId: string, rateId: string, dto: UpdateTaxRateDto): Promise<TaxRate> {
    await this.findProfileById(profileId);
    const rate = await this.repository.findRateById(rateId);

    if (!rate || rate.profile_id !== profileId) {
      throw new NotFoundException('Alíquota não encontrada neste perfil');
    }

    return this.repository.updateRate(rateId, {
      imposto: dto.imposto,
      aliquota_percentual: dto.aliquota_percentual,
      base_calculo: dto.base_calculo,
      incluso_no_preco: dto.incluso_no_preco,
      uf_origem: dto.uf_origem,
      uf_destino: dto.uf_destino,
    });
  }

  async deleteRate(profileId: string, rateId: string): Promise<void> {
    await this.findProfileById(profileId);
    const rate = await this.repository.findRateById(rateId);

    if (!rate || rate.profile_id !== profileId) {
      throw new NotFoundException('Alíquota não encontrada neste perfil');
    }

    await this.repository.deleteRate(rateId);
  }

  // ─── NcmTaxOverride ─────────────────────────────────────────────────────────

  findAllNcmOverrides(filters: QueryNcmOverrideDto): Promise<Page<NcmTaxOverride>> {
    return this.repository.findAllNcmOverrides(filters);
  }

  async createNcmOverride(dto: CreateNcmOverrideDto): Promise<NcmTaxOverride> {
    const existing = await this.repository.findNcmOverrideByNcmAndImposto(dto.ncm, dto.imposto);
    if (existing) {
      throw new ConflictException(
        `Já existe uma exceção NCM para o código ${dto.ncm} e imposto ${dto.imposto}`,
      );
    }

    return this.repository.createNcmOverride({
      ncm: dto.ncm,
      imposto: dto.imposto,
      aliquota_percentual: dto.aliquota_percentual,
      descricao: dto.descricao,
    });
  }

  async updateNcmOverride(id: string, dto: UpdateNcmOverrideDto): Promise<NcmTaxOverride> {
    const existing = await this.repository.findNcmOverrideById(id);
    if (!existing) {
      throw new NotFoundException('Exceção NCM não encontrada');
    }

    // If changing ncm or imposto, check uniqueness
    const newNcm = dto.ncm ?? existing.ncm;
    const newImposto = dto.imposto ?? existing.imposto;

    if (newNcm !== existing.ncm || newImposto !== existing.imposto) {
      const conflict = await this.repository.findNcmOverrideByNcmAndImposto(newNcm, newImposto);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Já existe uma exceção NCM para o código ${newNcm} e imposto ${newImposto}`,
        );
      }
    }

    return this.repository.updateNcmOverride(id, {
      ncm: dto.ncm,
      imposto: dto.imposto,
      aliquota_percentual: dto.aliquota_percentual,
      descricao: dto.descricao,
    });
  }

  async deleteNcmOverride(id: string): Promise<void> {
    const existing = await this.repository.findNcmOverrideById(id);
    if (!existing) {
      throw new NotFoundException('Exceção NCM não encontrada');
    }
    await this.repository.deleteNcmOverride(id);
  }

  // ─── Effective Rates ─────────────────────────────────────────────────────────

  async getEffectiveRates(profileId: string, ncm?: string): Promise<EffectiveRate[]> {
    const profile = await this.findProfileById(profileId);

    // Build a map of imposto -> rate from the profile
    const rateMap = new Map<string, EffectiveRate>();

    for (const rate of profile.rates) {
      rateMap.set(rate.imposto, {
        imposto: rate.imposto,
        aliquota_percentual: rate.aliquota_percentual,
        source: 'profile',
      });
    }

    // If NCM provided, apply overrides (NCM override takes priority)
    if (ncm) {
      const overrides = await this.repository.findNcmOverridesByNcm(ncm);

      for (const override of overrides) {
        // TipoImpostoNcm is a subset of TipoImposto — cast is safe for matching keys
        const impostoKey = override.imposto as string;
        rateMap.set(impostoKey, {
          imposto: impostoKey,
          aliquota_percentual: override.aliquota_percentual,
          source: 'ncm_override',
        });
      }
    }

    return Array.from(rateMap.values());
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Throws ConflictException if there is already a default profile for the given regime,
   * optionally excluding a profile id (used during update).
   */
  private async assertNoPaddingConflict(
    regime: import('@prisma/client').RegimeTributario,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.repository.findDefaultProfileByRegime(regime);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Já existe um perfil padrão para o regime ${regime}: "${existing.nome}". ` +
          'Desmarque o perfil atual como padrão antes de definir um novo.',
      );
    }
  }
}
