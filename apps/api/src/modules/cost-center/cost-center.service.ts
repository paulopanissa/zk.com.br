import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CostCenter, CostItem, Prisma, TipoCusto } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import {
  CostCenterPage,
  CostCenterRepository,
  CostCenterWithItems,
  CostSummary,
} from './cost-center.repository';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { CreateCostItemDto } from './dto/create-cost-item.dto';
import { ListCostCentersDto } from './dto/list-cost-centers.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { UpdateCostItemDto } from './dto/update-cost-item.dto';

@Injectable()
export class CostCenterService {
  constructor(
    private readonly repository: CostCenterRepository,
    private readonly tenancy: TenancyService,
  ) {}

  async create(dto: CreateCostCenterDto, user: JwtSystemPayload): Promise<CostCenter> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const existing = await this.repository.findByNome(dto.nome.trim(), unitId);

    if (existing) {
      throw new ConflictException('Já existe um centro de custo com este nome nesta unidade');
    }

    return this.repository.create({
      unidade_id: unitId,
      nome: dto.nome.trim(),
      descricao: dto.descricao,
    });
  }

  async findAll(
    filters: ListCostCentersDto,
    user: JwtSystemPayload,
  ): Promise<CostCenterPage> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { ativo, page = 1, limit = 20 } = filters;
    return this.repository.findAll(unitId, { ativo }, { page, limit });
  }

  async findById(id: string, user: JwtSystemPayload): Promise<CostCenterWithItems> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const costCenter = await this.repository.findById(id, unitId);

    if (!costCenter) {
      throw new NotFoundException('Centro de custo não encontrado');
    }

    return costCenter;
  }

  async update(
    id: string,
    dto: UpdateCostCenterDto,
    user: JwtSystemPayload,
  ): Promise<CostCenter> {
    const costCenter = await this.findById(id, user);
    const unitId = await this.tenancy.resolveUnitId(user);

    const updateData: Prisma.CostCenterUpdateInput = {};

    if (dto.nome !== undefined) {
      const trimmedNome = dto.nome.trim();
      if (trimmedNome !== costCenter.nome) {
        const conflict = await this.repository.findByNome(trimmedNome, unitId);
        if (conflict && conflict.id !== id) {
          throw new ConflictException('Já existe um centro de custo com este nome nesta unidade');
        }
        updateData.nome = trimmedNome;
      }
    }

    if (dto.descricao !== undefined) {
      updateData.descricao = dto.descricao;
    }

    if (dto.ativo !== undefined) {
      updateData.ativo = dto.ativo;
    }

    return this.repository.update(id, updateData);
  }

  async deactivate(id: string, user: JwtSystemPayload): Promise<CostCenter> {
    await this.findById(id, user);

    const count = await this.repository.countActiveItems(id);

    if (count > 0) {
      throw new UnprocessableEntityException(
        `Centro de custo possui ${count} item(ns) ativo(s). Desative os itens antes de desativar o centro de custo.`,
      );
    }

    return this.repository.deactivate(id);
  }

  async addItem(
    id: string,
    dto: CreateCostItemDto,
    user: JwtSystemPayload,
  ): Promise<CostItem> {
    const unitId = await this.tenancy.resolveUnitId(user);
    await this.findById(id, user);

    this.validateItemTypeConstraints(dto.tipo, dto.valor_centavos, dto.percentual_bps);

    return this.repository.addItem(id, unitId, dto);
  }

  async updateItem(
    id: string,
    itemId: string,
    dto: UpdateCostItemDto,
    user: JwtSystemPayload,
  ): Promise<CostItem> {
    const unitId = await this.tenancy.resolveUnitId(user);
    await this.findById(id, user);

    const item = await this.repository.findItemById(itemId, unitId);
    if (!item) {
      throw new NotFoundException('Item de custo não encontrado');
    }

    const resolvedTipo = dto.tipo ?? item.tipo;
    const resolvedValor = dto.valor_centavos !== undefined ? dto.valor_centavos : item.valor_centavos ?? undefined;
    const resolvedPercentual = dto.percentual_bps !== undefined ? dto.percentual_bps : item.percentual_bps ?? undefined;

    if (dto.tipo !== undefined || dto.valor_centavos !== undefined || dto.percentual_bps !== undefined) {
      this.validateItemTypeConstraints(resolvedTipo, resolvedValor, resolvedPercentual);
    }

    const updateData: Prisma.CostItemUpdateInput = {};

    if (dto.nome !== undefined) updateData.nome = dto.nome;
    if (dto.tipo !== undefined) updateData.tipo = dto.tipo;
    if (dto.valor_centavos !== undefined) updateData.valor_centavos = dto.valor_centavos;
    if (dto.percentual_bps !== undefined) updateData.percentual_bps = dto.percentual_bps;
    if (dto.descricao !== undefined) updateData.descricao = dto.descricao;
    if (dto.ativo !== undefined) updateData.ativo = dto.ativo;

    return this.repository.updateItem(itemId, updateData);
  }

  async deactivateItem(
    id: string,
    itemId: string,
    user: JwtSystemPayload,
  ): Promise<CostItem> {
    const unitId = await this.tenancy.resolveUnitId(user);
    await this.findById(id, user);

    const item = await this.repository.findItemById(itemId, unitId);
    if (!item) {
      throw new NotFoundException('Item de custo não encontrado');
    }

    return this.repository.deactivateItem(itemId);
  }

  async getSummary(user: JwtSystemPayload): Promise<CostSummary> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const items = await this.repository.getActiveItems(unitId);

    const total_fixo_centavos = items
      .filter((i) => i.tipo === TipoCusto.FIXO)
      .reduce((sum, i) => sum + (i.valor_centavos ?? 0), 0);

    const total_variavel_bps = items
      .filter((i) => i.tipo === TipoCusto.VARIAVEL)
      .reduce((sum, i) => sum + (i.percentual_bps ?? 0), 0);

    return { total_fixo_centavos, total_variavel_bps, items };
  }

  private validateItemTypeConstraints(
    tipo: TipoCusto,
    valor_centavos: number | null | undefined,
    percentual_bps: number | null | undefined,
  ): void {
    if (tipo === TipoCusto.FIXO) {
      if (!valor_centavos || valor_centavos < 1) {
        throw new UnprocessableEntityException(
          'Para itens do tipo FIXO, valor_centavos deve estar presente e ser maior que zero.',
        );
      }
      if (percentual_bps != null) {
        throw new UnprocessableEntityException(
          'Para itens do tipo FIXO, percentual_bps não deve ser informado.',
        );
      }
    }

    if (tipo === TipoCusto.VARIAVEL) {
      if (!percentual_bps || percentual_bps < 1) {
        throw new UnprocessableEntityException(
          'Para itens do tipo VARIAVEL, percentual_bps deve estar presente e ser maior que zero.',
        );
      }
      if (valor_centavos != null) {
        throw new UnprocessableEntityException(
          'Para itens do tipo VARIAVEL, valor_centavos não deve ser informado.',
        );
      }
    }
  }
}
