import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod, Prisma, VendaOrigem, VendaPaymentStatus, VendaStatus } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CuponsRepository } from '../cupons/cupons.repository';
import { CouponValidationResult, CuponsService } from '../cupons/cupons.service';
import { PrismaTx, StockRepository } from '../stock/stock.repository';
import { AddItemDto } from './dto/add-item.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateVendaDto } from './dto/create-venda.dto';
import { OfflineSaleDto, SyncOfflineDto } from './dto/sync-offline.dto';
import { QueryVendaDto } from './dto/query-venda.dto';
import { ReconcilePaymentDto } from './dto/reconcile-payment.dto';
import { SetDiscountDto } from './dto/set-discount.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { VendasRepository } from './vendas.repository';

@Injectable()
export class VendasService {
  constructor(
    private readonly repository: VendasRepository,
    private readonly tenancy: TenancyService,
    private readonly prisma: PrismaService,
    private readonly stockRepository: StockRepository,
    private readonly cuponsService: CuponsService,
    private readonly cuponsRepository: CuponsRepository,
  ) {}

  // ─── Venda ───────────────────────────────────────────────────────────────────

  async create(dto: CreateVendaDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);

    // Dedup pelo sync_id
    if (dto.sync_id) {
      const existing = await this.repository.findBySyncId(dto.sync_id, unitId);
      if (existing) return existing;
    }

    if (dto.cliente_id) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.cliente_id, unidade_id: unitId, ativo: true },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException('Cliente não encontrado nesta unidade');
    }

    return this.repository.create({
      status: VendaStatus.ABERTA,
      origem: dto.origem ?? VendaOrigem.PDV,
      created_by: user.sub,
      desconto_total_centavos: 0,
      total_bruto_centavos: 0,
      total_liquido_centavos: 0,
      sync_id: dto.sync_id ?? null,
      observacao: dto.observacao ?? null,
      unit: { connect: { id: unitId } },
      ...(dto.cliente_id ? { cliente: { connect: { id: dto.cliente_id } } } : {}),
    });
  }

  async findAll(query: QueryVendaDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    return this.repository.findAll(
      unitId,
      {
        status: query.status,
        origem: query.origem,
        cliente_id: query.cliente_id,
        data_inicio: query.data_inicio ? new Date(query.data_inicio) : undefined,
        data_fim: query.data_fim ? new Date(query.data_fim) : undefined,
      },
      { page: query.page ?? 1, limit: query.limit ?? 20 },
    );
  }

  async findById(id: string, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const venda = await this.repository.findById(id, unitId);
    if (!venda) throw new NotFoundException('Venda não encontrada');
    return venda;
  }

  // ─── Itens ────────────────────────────────────────────────────────────────────

  async addItem(id: string, dto: AddItemDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const venda = await this.repository.findById(id, unitId);
    if (!venda) throw new NotFoundException('Venda não encontrada');
    if (venda.status !== VendaStatus.ABERTA) {
      throw new UnprocessableEntityException('Apenas vendas abertas podem receber itens');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.product_id, unidade_id: unitId, active: true },
      include: { pricing: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado nesta unidade');
    if (!product.pricing) {
      throw new UnprocessableEntityException('Produto sem precificação cadastrada');
    }

    const precoUnitario = product.pricing.sale_price_cents;
    const desconto = dto.desconto_item_centavos ?? 0;
    const totalItem = Math.max(
      0,
      Math.round(precoUnitario * dto.quantidade) - desconto,
    );

    const nextNumero =
      venda.items.length > 0
        ? Math.max(...venda.items.map((i) => i.numero_item)) + 1
        : 1;

    const item = await this.repository.addItem(id, {
      venda: { connect: { id } },
      product: { connect: { id: dto.product_id } },
      numero_item: nextNumero,
      quantidade: new Decimal(dto.quantidade),
      preco_unitario_centavos: precoUnitario,
      desconto_item_centavos: desconto,
      total_centavos: totalItem,
    });

    await this._recalcTotals(id, unitId);
    return item;
  }

  async updateItem(id: string, itemId: string, dto: UpdateItemDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const venda = await this.repository.findById(id, unitId);
    if (!venda) throw new NotFoundException('Venda não encontrada');
    if (venda.status !== VendaStatus.ABERTA) {
      throw new UnprocessableEntityException('Apenas vendas abertas podem ter itens atualizados');
    }
    const item = venda.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item não encontrado nesta venda');

    const novaQtd = dto.quantidade ?? Number(item.quantidade);
    const novoDesc = dto.desconto_item_centavos ?? item.desconto_item_centavos;
    const novoTotal = Math.max(
      0,
      Math.round(item.preco_unitario_centavos * novaQtd) - novoDesc,
    );

    const updated = await this.repository.updateItem(itemId, id, unitId, {
      quantidade: new Decimal(novaQtd),
      desconto_item_centavos: novoDesc,
      total_centavos: novoTotal,
    });
    await this._recalcTotals(id, unitId);
    return updated;
  }

  async removeItem(id: string, itemId: string, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const venda = await this.repository.findById(id, unitId);
    if (!venda) throw new NotFoundException('Venda não encontrada');
    if (venda.status !== VendaStatus.ABERTA) {
      throw new UnprocessableEntityException('Apenas vendas abertas podem ter itens removidos');
    }
    if (!venda.items.find((i) => i.id === itemId)) {
      throw new NotFoundException('Item não encontrado nesta venda');
    }
    await this.repository.deleteItem(itemId, id, unitId);
    await this._recalcTotals(id, unitId);
    return { deleted: true };
  }

  // ─── Desconto ────────────────────────────────────────────────────────────────

  async setDiscount(id: string, dto: SetDiscountDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const venda = await this.repository.findById(id, unitId);
    if (!venda) throw new NotFoundException('Venda não encontrada');
    if (venda.status !== VendaStatus.ABERTA) {
      throw new UnprocessableEntityException('Apenas vendas abertas podem ter desconto aplicado');
    }
    if (dto.desconto_total_centavos > venda.total_bruto_centavos) {
      throw new BadRequestException('Desconto não pode ser maior que o total bruto');
    }
    return this._recalcTotals(id, unitId, dto.desconto_total_centavos);
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────────

  async checkout(id: string, dto: CheckoutDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const venda = await this.repository.findById(id, unitId);
    if (!venda) throw new NotFoundException('Venda não encontrada');
    if (venda.status !== VendaStatus.ABERTA) {
      throw new UnprocessableEntityException('Apenas vendas abertas podem ser finalizadas');
    }
    if (venda.items.length === 0) {
      throw new UnprocessableEntityException('Não é possível finalizar uma venda sem itens');
    }

    // Validar cupom ANTES de abrir a transação — falha rápida
    let couponValidation: CouponValidationResult | null = null;
    if (dto.coupon_code) {
      const productIds = venda.items.map((i) => i.product_id);
      couponValidation = await this.cuponsService.validateForUnit(
        dto.coupon_code,
        productIds,
        unitId,
        venda.total_liquido_centavos,
      );
    }

    // Calcular total líquido com desconto do cupom
    const descontoCupom = couponValidation?.discount_centavos ?? 0;
    const totalLiquidoComCupom = Math.max(0, venda.total_liquido_centavos - descontoCupom);

    const totalPagamentos = dto.pagamentos.reduce((s, p) => s + p.valor_centavos, 0);
    const totalLiquido = totalLiquidoComCupom;

    if (totalPagamentos < totalLiquido) {
      throw new BadRequestException(
        `Total de pagamentos (${totalPagamentos}) é menor que o total da venda (${totalLiquido})`,
      );
    }

    // Troco: diferença entre o que foi pago e o total — só calculado para DINHEIRO
    const trocoTotal = totalPagamentos - totalLiquido;

    await this.prisma.$transaction(async (tx) => {
      // Re-check de status dentro da tx — previne double-checkout concorrente
      const locked = await tx.venda.findFirst({
        where: { id, unidade_id: unitId, status: VendaStatus.ABERTA },
        select: { id: true },
      });
      if (!locked) {
        throw new UnprocessableEntityException('Venda não está mais em status ABERTA');
      }

      // Re-ler itens dentro da tx para evitar snapshot stale (C1 TOCTOU)
      const txItems = await tx.vendaItem.findMany({ where: { venda_id: id } });

      // Reservar estoque FIFO para cada item (dentro da mesma transação)
      for (const item of txItems) {
        await this.stockRepository.reserveFifoInTx(
          tx as unknown as PrismaTx,
          unitId,
          item.product_id,
          Number(item.quantidade),
          `sale-${id}-item-${item.id}`,
          item.id,
          user.sub,
        );
      }

      // Criar pagamentos — troco vai inteiro para o primeiro pagamento DINHEIRO
      let trocoRestante = trocoTotal;
      for (const pag of dto.pagamentos) {
        let troco = 0;
        if (pag.metodo === PaymentMethod.DINHEIRO && trocoRestante > 0) {
          troco = trocoRestante;
          trocoRestante = 0;
        }
        await tx.vendaPayment.create({
          data: {
            venda_id: id,
            metodo: pag.metodo,
            valor_centavos: pag.valor_centavos,
            status: VendaPaymentStatus.PAGO,
            troco_centavos: troco,
            pago_em: new Date(),
          },
        });
      }

      // Finalizar venda — atualiza total líquido se cupom foi aplicado
      await tx.venda.update({
        where: { id, unidade_id: unitId },
        data: {
          status: VendaStatus.FINALIZADA,
          finalizada_em: new Date(),
          ...(couponValidation
            ? {
                desconto_total_centavos: venda.desconto_total_centavos + descontoCupom,
                total_liquido_centavos: totalLiquidoComCupom,
              }
            : {}),
          ...(dto.observacao ? { observacao: dto.observacao } : {}),
        },
      });

      // Registrar uso do cupom dentro da tx — atômico com a finalização da venda (C2)
      if (couponValidation) {
        const couponResult = await this.cuponsRepository.incrementUsesInTx(
          tx as unknown as PrismaService,
          couponValidation.coupon_id,
          id,
        );
        if (!couponResult.success) {
          throw new UnprocessableEntityException('Cupom atingiu o limite de usos durante o checkout');
        }
      }
    });

    return (await this.repository.findById(id, unitId))!;
  }

  // ─── Cancelamento ────────────────────────────────────────────────────────────

  async cancel(id: string, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const venda = await this.repository.findById(id, unitId);
    if (!venda) throw new NotFoundException('Venda não encontrada');
    if (venda.status === VendaStatus.CANCELADA) {
      throw new UnprocessableEntityException('Venda já está cancelada');
    }

    await this.prisma.$transaction(async (tx) => {
      // Re-check dentro da tx
      const locked = await tx.venda.findFirst({
        where: { id, unidade_id: unitId, status: { not: VendaStatus.CANCELADA } },
        select: { id: true, status: true },
      });
      if (!locked) throw new UnprocessableEntityException('Venda não pode ser cancelada');

      // Se FINALIZADA, reverter estoque via StockMovement de SALE_RETURN (idempotente)
      if (locked.status === VendaStatus.FINALIZADA) {
        for (const item of venda.items) {
          const movements = await tx.stockMovement.findMany({
            where: {
              reference_id: item.id,
              reference_type: 'venda_item',
              unidade_id: unitId,
              type: 'SALE_OUT',
            },
          });

          for (const mv of movements) {
            await tx.stockMovement.upsert({
              where: { idempotency_key: `sale-cancel-${mv.id}` },
              update: {},
              create: {
                unidade_id: unitId,
                product_id: mv.product_id,
                lot_id: mv.lot_id,
                type: 'SALE_RETURN',
                // Reverter: quantidade positiva (entrada de volta ao estoque)
                quantity: mv.quantity.abs(),
                reference_id: id,
                reference_type: 'venda_cancel',
                idempotency_key: `sale-cancel-${mv.id}`,
                notes: `Cancelamento da venda ${id}`,
                created_by: user.sub,
              },
            });
          }
        }

        // Cancelar pagamentos
        await tx.vendaPayment.updateMany({
          where: { venda_id: id },
          data: { status: VendaPaymentStatus.CANCELADO },
        });
      }

      await tx.venda.update({
        where: { id, unidade_id: unitId },
        data: { status: VendaStatus.CANCELADA, cancelada_em: new Date() },
      });
    });

    return (await this.repository.findById(id, unitId))!;
  }

  // ─── Sync Offline ─────────────────────────────────────────────────────────────

  async syncOffline(dto: SyncOfflineDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const results: Array<{
      sync_id: string;
      status: 'created' | 'skipped' | 'error';
      id?: string;
      error?: string;
    }> = [];

    for (const saleDto of dto.vendas) {
      try {
        const existing = await this.repository.findBySyncId(saleDto.sync_id, unitId);
        if (existing) {
          results.push({ sync_id: saleDto.sync_id, status: 'skipped', id: existing.id });
          continue;
        }

        const result = await this._createOfflineSale(saleDto, unitId, user);
        results.push({ sync_id: saleDto.sync_id, status: 'created', id: result.id });
      } catch (e) {
        results.push({
          sync_id: saleDto.sync_id,
          status: 'error',
          error: (e as Error).message,
        });
      }
    }

    return {
      results,
      total: dto.vendas.length,
      created: results.filter((r) => r.status === 'created').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
    };
  }

  // ─── Reconciliação de pagamento ──────────────────────────────────────────────

  async reconcilePayment(
    vendaId: string,
    paymentId: string,
    dto: ReconcilePaymentDto,
    user: JwtSystemPayload,
  ) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const venda = await this.repository.findById(vendaId, unitId);
    if (!venda) throw new NotFoundException('Venda não encontrada');

    const payment = venda.payments.find((p) => p.id === paymentId);
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    if (payment.status === VendaPaymentStatus.PAGO) {
      throw new ConflictException('Pagamento já reconciliado');
    }

    return this.repository.updatePayment(paymentId, vendaId, unitId, {
      status: VendaPaymentStatus.PAGO,
      pago_em: dto.pago_em ? new Date(dto.pago_em) : new Date(),
      ...(dto.provider_transaction_id
        ? { provider_transaction_id: dto.provider_transaction_id }
        : {}),
    });
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────────

  /**
   * Recalcula totais da venda com base nos itens existentes.
   * `descontoManual` sobrescreve o desconto_total_centavos existente quando fornecido.
   */
  private async _recalcTotals(
    vendaId: string,
    unitId: string,
    descontoManual?: number,
  ) {
    const items = await this.prisma.vendaItem.findMany({
      where: { venda_id: vendaId, venda: { unidade_id: unitId } },
    });

    // total_bruto = soma de (preco_unitario * quantidade) sem desconto de item
    const totalBruto = items.reduce(
      (s, i) => s + i.total_centavos + i.desconto_item_centavos,
      0,
    );
    // total_itens = soma dos totais já com desconto por item aplicado
    const totalItens = items.reduce((s, i) => s + i.total_centavos, 0);

    const current = await this.prisma.venda.findFirst({
      where: { id: vendaId, unidade_id: unitId },
      select: { desconto_total_centavos: true },
    });
    const desconto =
      descontoManual !== undefined ? descontoManual : (current?.desconto_total_centavos ?? 0);
    const totalLiquido = Math.max(0, totalItens - desconto);

    return this.prisma.venda.update({
      where: { id: vendaId, unidade_id: unitId },
      data: {
        total_bruto_centavos: totalBruto,
        total_liquido_centavos: totalLiquido,
        desconto_total_centavos: desconto,
      },
    });
  }

  /**
   * Cria uma venda offline já finalizada dentro de uma única transação atômica.
   * Baixa de estoque FIFO é aplicada para cada item.
   */
  private async _createOfflineSale(
    dto: OfflineSaleDto,
    unitId: string,
    user: JwtSystemPayload,
  ) {
    const totalBruto = dto.items.reduce(
      (s, i) => s + Math.round(i.preco_unitario_centavos * i.quantidade),
      0,
    );
    const totalItens = dto.items.reduce(
      (s, i) =>
        s + Math.max(0, Math.round(i.preco_unitario_centavos * i.quantidade) - i.desconto_item_centavos),
      0,
    );
    const totalSemCupom = Math.max(0, totalItens - dto.desconto_total_centavos);

    // Validar cupom ANTES de abrir a transação — falha rápida
    let couponValidation: CouponValidationResult | null = null;
    if (dto.coupon_code) {
      const productIds = dto.items.map((i) => i.product_id);
      couponValidation = await this.cuponsService.validateForUnit(
        dto.coupon_code,
        productIds,
        unitId,
        totalSemCupom,
      );
    }

    const descontoCupom = couponValidation?.discount_centavos ?? 0;
    const descontoTotal = dto.desconto_total_centavos + descontoCupom;
    const totalLiquido = Math.max(0, totalSemCupom - descontoCupom);

    if (dto.cliente_id) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.cliente_id, unidade_id: unitId, ativo: true },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException('Cliente não encontrado nesta unidade');
    }

    const venda = await this.prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          unidade_id: unitId,
          status: VendaStatus.FINALIZADA,
          origem: VendaOrigem.PDV_OFFLINE,
          created_by: user.sub,
          sync_id: dto.sync_id,
          observacao: dto.observacao ?? null,
          desconto_total_centavos: descontoTotal,
          total_bruto_centavos: totalBruto,
          total_liquido_centavos: totalLiquido,
          finalizada_em: new Date(dto.created_at),
          ...(dto.cliente_id ? { cliente_id: dto.cliente_id } : {}),
        },
      });

      let itemNumero = 1;
      for (const itemDto of dto.items) {
        const total = Math.max(
          0,
          Math.round(itemDto.preco_unitario_centavos * itemDto.quantidade) -
            itemDto.desconto_item_centavos,
        );
        const item = await tx.vendaItem.create({
          data: {
            venda_id: novaVenda.id,
            product_id: itemDto.product_id,
            numero_item: itemNumero++,
            quantidade: new Decimal(itemDto.quantidade),
            preco_unitario_centavos: itemDto.preco_unitario_centavos,
            desconto_item_centavos: itemDto.desconto_item_centavos,
            total_centavos: total,
          },
        });

        // Reservar estoque FIFO dentro da mesma transação
        await this.stockRepository.reserveFifoInTx(
          tx as unknown as PrismaTx,
          unitId,
          itemDto.product_id,
          itemDto.quantidade,
          `sale-${novaVenda.id}-item-${item.id}`,
          item.id,
          user.sub,
        );
      }

      for (const pag of dto.pagamentos) {
        await tx.vendaPayment.create({
          data: {
            venda_id: novaVenda.id,
            metodo: pag.metodo,
            valor_centavos: pag.valor_centavos,
            status: VendaPaymentStatus.PAGO,
            troco_centavos: 0,
            pago_em: new Date(dto.created_at),
          },
        });
      }

      // Registrar uso do cupom dentro da tx — atômico com a criação da venda (C2)
      if (couponValidation) {
        const couponResult = await this.cuponsRepository.incrementUsesInTx(
          tx as unknown as PrismaService,
          couponValidation.coupon_id,
          novaVenda.id,
        );
        if (!couponResult.success) {
          throw new UnprocessableEntityException('Cupom atingiu o limite de usos durante o sync offline');
        }
      }

      return novaVenda;
    });

    return venda;
  }
}
