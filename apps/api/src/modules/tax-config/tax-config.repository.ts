import { Injectable } from '@nestjs/common';
import {
  NcmTaxOverride,
  Prisma,
  RegimeTributario,
  TaxProfile,
  TaxRate,
  TipoImpostoNcm,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryNcmOverrideDto } from './dto/query-ncm-override.dto';
import { QueryTaxProfileDto } from './dto/query-tax-profile.dto';

export type TaxProfileWithRates = TaxProfile & { rates: TaxRate[] };

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class TaxConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── TaxProfile ────────────────────────────────────────────────────────────

  async findAllProfiles(filters: QueryTaxProfileDto): Promise<Page<TaxProfile>> {
    const where: Prisma.TaxProfileWhereInput = {};

    if (filters.regime_tributario !== undefined) {
      where.regime_tributario = filters.regime_tributario;
    }
    if (filters.ativo !== undefined) {
      where.ativo = filters.ativo;
    }
    if (filters.padrao !== undefined) {
      where.padrao = filters.padrao;
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.taxProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.taxProfile.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  findProfileById(id: string): Promise<TaxProfileWithRates | null> {
    return this.prisma.taxProfile.findUnique({
      where: { id },
      include: { rates: true },
    });
  }

  findDefaultProfileByRegime(regime: RegimeTributario): Promise<TaxProfile | null> {
    return this.prisma.taxProfile.findFirst({
      where: { regime_tributario: regime, padrao: true },
    });
  }

  createProfile(data: Prisma.TaxProfileCreateInput): Promise<TaxProfile> {
    return this.prisma.taxProfile.create({ data });
  }

  updateProfile(id: string, data: Prisma.TaxProfileUpdateInput): Promise<TaxProfile> {
    return this.prisma.taxProfile.update({ where: { id }, data });
  }

  async deleteProfile(id: string): Promise<void> {
    await this.prisma.taxProfile.delete({ where: { id } });
  }

  // ─── TaxRate ────────────────────────────────────────────────────────────────

  findRatesByProfileId(profileId: string): Promise<TaxRate[]> {
    return this.prisma.taxRate.findMany({
      where: { profile_id: profileId },
      orderBy: { imposto: 'asc' },
    });
  }

  findRateById(rateId: string): Promise<TaxRate | null> {
    return this.prisma.taxRate.findUnique({ where: { id: rateId } });
  }

  createRate(data: Prisma.TaxRateCreateInput): Promise<TaxRate> {
    return this.prisma.taxRate.create({ data });
  }

  updateRate(rateId: string, data: Prisma.TaxRateUpdateInput): Promise<TaxRate> {
    return this.prisma.taxRate.update({ where: { id: rateId }, data });
  }

  async deleteRate(rateId: string): Promise<void> {
    await this.prisma.taxRate.delete({ where: { id: rateId } });
  }

  // ─── NcmTaxOverride ─────────────────────────────────────────────────────────

  async findAllNcmOverrides(filters: QueryNcmOverrideDto): Promise<Page<NcmTaxOverride>> {
    const where: Prisma.NcmTaxOverrideWhereInput = {};

    if (filters.ncm !== undefined) {
      where.ncm = filters.ncm;
    }
    if (filters.imposto !== undefined) {
      where.imposto = filters.imposto;
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ncmTaxOverride.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ ncm: 'asc' }, { imposto: 'asc' }],
      }),
      this.prisma.ncmTaxOverride.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  findNcmOverrideById(id: string): Promise<NcmTaxOverride | null> {
    return this.prisma.ncmTaxOverride.findUnique({ where: { id } });
  }

  findNcmOverrideByNcmAndImposto(
    ncm: string,
    imposto: TipoImpostoNcm,
  ): Promise<NcmTaxOverride | null> {
    return this.prisma.ncmTaxOverride.findUnique({ where: { ncm_imposto: { ncm, imposto } } });
  }

  findNcmOverridesByNcm(ncm: string): Promise<NcmTaxOverride[]> {
    return this.prisma.ncmTaxOverride.findMany({ where: { ncm } });
  }

  createNcmOverride(data: Prisma.NcmTaxOverrideCreateInput): Promise<NcmTaxOverride> {
    return this.prisma.ncmTaxOverride.create({ data });
  }

  updateNcmOverride(
    id: string,
    data: Prisma.NcmTaxOverrideUpdateInput,
  ): Promise<NcmTaxOverride> {
    return this.prisma.ncmTaxOverride.update({ where: { id }, data });
  }

  async deleteNcmOverride(id: string): Promise<void> {
    await this.prisma.ncmTaxOverride.delete({ where: { id } });
  }
}
