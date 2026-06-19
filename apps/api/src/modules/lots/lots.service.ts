import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { CreateLotDto } from './dto/create-lot.dto';
import { QueryExpiringDto } from './dto/query-expiring.dto';
import { QueryLotsDto } from './dto/query-lots.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { LotRecord, LotWithProduct, LotsRepository } from './lots.repository';

@Injectable()
export class LotsService {
  constructor(
    private readonly repository: LotsRepository,
    private readonly tenancy: TenancyService,
  ) {}

  async create(dto: CreateLotDto, user: JwtSystemPayload): Promise<LotRecord> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const existing = await this.repository.findByProductAndCode(
      dto.product_id,
      dto.code,
      unitId,
    );
    if (existing) {
      throw new ConflictException(
        `Já existe um lote com o código '${dto.code}' para este produto nesta unidade`,
      );
    }

    const data: Prisma.LotCreateInput = {
      code: dto.code,
      quantity_received: new Prisma.Decimal(dto.quantity_received),
      tags: dto.tags ?? [],
      active: dto.active ?? true,
      notes: dto.notes ?? null,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      manufactured_at: dto.manufactured_at ? new Date(dto.manufactured_at) : null,
      ...(dto.invoice_item_id ? { invoice_item: { connect: { id: dto.invoice_item_id } } } : {}),
      unit: { connect: { id: unitId } },
      product: { connect: { id: dto.product_id } },
    };

    return this.repository.create(data);
  }

  async findAll(filters: QueryLotsDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const {
      page = 1,
      limit = 20,
      product_id,
      expires_before,
      expires_after,
      active,
      tags,
      code,
    } = filters;

    return this.repository.findAll(
      unitId,
      { product_id, expires_before, expires_after, active, tags, code },
      { page, limit },
    );
  }

  async findById(id: string, user: JwtSystemPayload): Promise<LotRecord & { balance: number }> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const lot = await this.repository.findById(id, unitId);
    if (!lot) throw new NotFoundException('Lote não encontrado');

    const balance = await this.repository.getBalance(lot.id);
    return { ...lot, balance };
  }

  async findByProduct(
    productId: string,
    pagination: { page: number; limit: number },
    user: JwtSystemPayload,
  ) {
    const unitId = await this.tenancy.resolveUnitId(user);
    return this.repository.findByProduct(productId, unitId, pagination);
  }

  async findExpiring(query: QueryExpiringDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { days = 30, page = 1, limit = 20 } = query;
    return this.repository.findExpiring(unitId, days, { page, limit });
  }

  async update(id: string, dto: UpdateLotDto, user: JwtSystemPayload): Promise<LotRecord> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const lot = await this.repository.findById(id, unitId);
    if (!lot) throw new NotFoundException('Lote não encontrado');

    // Validar unicidade do novo código (se alterado)
    if (dto.code !== undefined && dto.code !== lot.code) {
      const conflict = await this.repository.findByProductAndCode(
        lot.product_id,
        dto.code,
        unitId,
      );
      if (conflict) {
        throw new ConflictException(
          `Já existe um lote com o código '${dto.code}' para este produto nesta unidade`,
        );
      }
    }

    const data: Prisma.LotUpdateInput = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.expires_at !== undefined) data.expires_at = dto.expires_at ? new Date(dto.expires_at) : null;
    if (dto.manufactured_at !== undefined)
      data.manufactured_at = dto.manufactured_at ? new Date(dto.manufactured_at) : null;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.active !== undefined) data.active = dto.active;

    return this.repository.update(id, unitId, data);
  }

  async deactivate(id: string, user: JwtSystemPayload): Promise<void> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const lot = await this.repository.findById(id, unitId);
    if (!lot) throw new NotFoundException('Lote não encontrado');

    const balance = await this.repository.getBalance(lot.id);
    if (balance > 0) {
      throw new ConflictException('Lote com saldo não pode ser desativado');
    }

    await this.repository.deactivate(id, unitId);
  }
}
