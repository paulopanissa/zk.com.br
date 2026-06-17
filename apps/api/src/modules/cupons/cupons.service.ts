import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CouponType, Prisma } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CuponsRepository } from './cupons.repository';

export interface CouponValidationResult {
  coupon_id: string;
  code: string;
  type: CouponType;
  /** Desconto calculado em centavos (inteiro) */
  discount_centavos: number;
  description: string | null;
}

@Injectable()
export class CuponsService {
  constructor(
    private readonly repository: CuponsRepository,
    private readonly tenancy: TenancyService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCouponDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const code = dto.code.toUpperCase().trim();

    if (dto.product_id) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.product_id, unidade_id: unitId, active: true },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Produto não encontrado nesta unidade');
    }

    if (dto.type === CouponType.FIXO && (!dto.value_centavos || dto.value_centavos <= 0)) {
      throw new BadRequestException('Cupom FIXO requer value_centavos > 0');
    }
    if (dto.type === CouponType.PERCENTUAL && (!dto.percent_bps || dto.percent_bps <= 0)) {
      throw new BadRequestException('Cupom PERCENTUAL requer percent_bps > 0');
    }

    try {
      return await this.repository.create({
        code,
        type: dto.type,
        value_centavos: dto.value_centavos ?? 0,
        percent_bps: dto.percent_bps ?? 0,
        description: dto.description ?? null,
        active: true,
        max_uses: dto.max_uses ?? null,
        uses_count: 0,
        valid_from: dto.valid_from ? new Date(dto.valid_from) : null,
        valid_until: dto.valid_until ? new Date(dto.valid_until) : null,
        created_by: user.sub,
        unit: { connect: { id: unitId } },
        ...(dto.product_id ? { product: { connect: { id: dto.product_id } } } : {}),
      });
    } catch (e) {
      if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
        throw new ConflictException(`Cupom com código '${code}' já existe nesta unidade`);
      }
      throw e;
    }
  }

  async findAll(query: QueryCouponDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    return this.repository.findAll(
      unitId,
      { type: query.type, active: query.active },
      { page: query.page ?? 1, limit: query.limit ?? 20 },
    );
  }

  async findById(id: string, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const coupon = await this.repository.findById(id, unitId);
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const coupon = await this.repository.findById(id, unitId);
    if (!coupon) throw new NotFoundException('Cupom não encontrado');

    const updateData: Prisma.CouponUpdateInput = {};
    if (dto.code !== undefined) updateData.code = dto.code.toUpperCase().trim();
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.value_centavos !== undefined) updateData.value_centavos = dto.value_centavos;
    if (dto.percent_bps !== undefined) updateData.percent_bps = dto.percent_bps;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.max_uses !== undefined) updateData.max_uses = dto.max_uses;
    if (dto.valid_from !== undefined) {
      updateData.valid_from = dto.valid_from ? new Date(dto.valid_from) : null;
    }
    if (dto.valid_until !== undefined) {
      updateData.valid_until = dto.valid_until ? new Date(dto.valid_until) : null;
    }
    if (dto.product_id !== undefined) {
      if (dto.product_id) {
        const product = await this.prisma.product.findFirst({
          where: { id: dto.product_id, unidade_id: unitId, active: true },
          select: { id: true },
        });
        if (!product) throw new NotFoundException('Produto não encontrado nesta unidade');
        updateData.product = { connect: { id: dto.product_id } };
      } else {
        updateData.product = { disconnect: true };
      }
    }

    try {
      return await this.repository.update(id, unitId, updateData);
    } catch (e) {
      if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
        throw new ConflictException('Código de cupom já em uso');
      }
      throw e;
    }
  }

  async delete(id: string, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const coupon = await this.repository.findById(id, unitId);
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    if (coupon.uses_count > 0) {
      throw new UnprocessableEntityException(
        'Não é possível excluir cupom que já foi utilizado. Desative-o em vez disso.',
      );
    }
    await this.repository.delete(id, unitId);
    return { deleted: true };
  }

  async validate(dto: ValidateCouponDto, user: JwtSystemPayload): Promise<CouponValidationResult> {
    const unitId = await this.tenancy.resolveUnitId(user);
    return this.validateForUnit(dto.code, dto.product_ids ?? [], unitId, dto.cart_total_centavos ?? 0);
  }

  /**
   * Valida e calcula o desconto de um cupom para um carrinho.
   * Usado internamente pelo módulo de Vendas no checkout.
   *
   * @param code          Código do cupom (case-insensitive)
   * @param productIds    IDs dos produtos presentes no carrinho
   * @param unitId        Unidade resolvida pelo TenancyService — NUNCA vinda do cliente
   * @param cartTotal     Total bruto do carrinho em centavos (antes do desconto do cupom)
   */
  async validateForUnit(
    code: string,
    productIds: string[],
    unitId: string,
    cartTotal: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.repository.findByCode(code, unitId);
    if (!coupon) throw new NotFoundException(`Cupom '${code}' não encontrado`);
    if (!coupon.active) throw new UnprocessableEntityException('Cupom inativo');

    const now = new Date();
    if (coupon.valid_from && coupon.valid_from > now) {
      throw new UnprocessableEntityException('Cupom ainda não está vigente');
    }
    if (coupon.valid_until && coupon.valid_until < now) {
      throw new UnprocessableEntityException('Cupom expirado');
    }
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      throw new UnprocessableEntityException('Cupom esgotado (limite de usos atingido)');
    }

    // Valida restrição por produto — cupom requer produto específico no carrinho
    if (coupon.product_id && productIds.length > 0 && !productIds.includes(coupon.product_id)) {
      throw new UnprocessableEntityException(
        'Cupom válido apenas para um produto específico que não está no carrinho',
      );
    }

    let discountCentavos = 0;
    if (coupon.type === CouponType.FIXO) {
      discountCentavos = coupon.value_centavos;
    } else if (coupon.type === CouponType.PERCENTUAL) {
      // Aritmética em inteiros: percent_bps / 10000 = fração do desconto
      discountCentavos = Math.round((cartTotal * coupon.percent_bps) / 10000);
    }
    // FRETE_GRATIS: sem desconto monetário direto no PDV

    return {
      coupon_id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discount_centavos: discountCentavos,
      description: coupon.description,
    };
  }

  /**
   * Registra uso do cupom após a venda ser finalizada.
   * Idempotente: mesma (couponId, vendaId) não incrementa duas vezes.
   */
  async applyCouponToSale(couponId: string, vendaId: string): Promise<void> {
    const result = await this.repository.incrementUses(couponId, vendaId);
    if (!result.success) {
      throw new UnprocessableEntityException(
        'Não foi possível aplicar o cupom (limite atingido ou cupom inativo)',
      );
    }
  }
}
