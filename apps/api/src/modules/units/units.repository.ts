import { Injectable } from '@nestjs/common';
import { Prisma, TipoUnidade, Unit, UnitAddress, UnitConfig } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertUnitAddressDto } from './dto/upsert-unit-address.dto';
import { UpdateUnitConfigDto } from './dto/update-unit-config.dto';

export type UnitWithRelations = Unit & {
  address: UnitAddress | null;
  config: UnitConfig | null;
};

export interface CreateUnitData {
  company_settings_id: string;
  nome: string;
  slug: string;
  tipo: TipoUnidade;
  cnpj_inscricao?: string | null;
  permite_venda_offline?: boolean;
}

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companySettingsId: string, includeInactive: boolean): Promise<UnitWithRelations[]> {
    const where: Prisma.UnitWhereInput = { company_settings_id: companySettingsId };

    if (!includeInactive) {
      where.ativa = true;
    }

    return this.prisma.unit.findMany({
      where,
      include: { address: true, config: true },
      orderBy: { created_at: 'asc' },
    });
  }

  findById(id: string): Promise<UnitWithRelations | null> {
    return this.prisma.unit.findUnique({
      where: { id },
      include: { address: true, config: true },
    });
  }

  findByIdScoped(id: string, companySettingsId: string): Promise<UnitWithRelations | null> {
    return this.prisma.unit.findFirst({
      where: { id, company_settings_id: companySettingsId },
      include: { address: true, config: true },
    });
  }

  async create(data: CreateUnitData): Promise<Unit> {
    const { company_settings_id, ...rest } = data;

    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.unit.create({
        data: {
          ...rest,
          company_settings: { connect: { id: company_settings_id } },
        },
      });

      await tx.unitConfig.create({
        data: { unit_id: unit.id },
      });

      return unit;
    });
  }

  update(id: string, data: Prisma.UnitUpdateInput): Promise<Unit> {
    return this.prisma.unit.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<Unit> {
    return this.prisma.unit.update({ where: { id }, data: { ativa: false } });
  }

  countActiveMatriz(companySettingsId: string): Promise<number> {
    return this.prisma.unit.count({
      where: {
        company_settings_id: companySettingsId,
        tipo: TipoUnidade.MATRIZ,
        ativa: true,
      },
    });
  }

  findBySlug(slug: string): Promise<Unit | null> {
    return this.prisma.unit.findUnique({ where: { slug } });
  }

  async existsSlug(slug: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.UnitWhereInput = { slug };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.unit.count({ where });
    return count > 0;
  }

  async upsertAddress(unitId: string, data: UpsertUnitAddressDto): Promise<UnitAddress> {
    return this.prisma.unitAddress.upsert({
      where: { unit_id: unitId },
      create: { unit_id: unitId, ...data },
      update: { ...data },
    });
  }

  findConfig(unitId: string): Promise<UnitConfig | null> {
    return this.prisma.unitConfig.findUnique({ where: { unit_id: unitId } });
  }

  updateConfig(unitId: string, data: UpdateUnitConfigDto): Promise<UnitConfig> {
    return this.prisma.unitConfig.update({ where: { unit_id: unitId }, data });
  }
}
