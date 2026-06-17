import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AlertThresholdUnit, AlertType, Prisma } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { QueryAlertEventDto } from './dto/query-alert-event.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { AlertasRepository } from './alertas.repository';

/**
 * Contexto passado ao dispatcher para avaliar e construir eventos.
 * Todos os campos de contexto são opcionais: cada tipo de alerta usa apenas
 * os campos relevantes (ver evaluateRule).
 */
export interface DispatchContext {
  /** ID da unidade onde o evento ocorreu (obrigatório). */
  unitId: string;
  /** ID do produto relacionado ao alerta (ESTOQUE_BAIXO, MARGEM_BAIXA). */
  productId?: string;
  /** ID da venda relacionada (VENDA_FINALIZADA). */
  vendaId?: string;
  /** ID do cupom esgotado (CUPOM_ESGOTADO). */
  couponId?: string;
  /** Saldo atual em unidades (necessário para ESTOQUE_BAIXO). */
  currentStock?: number;
  /** Margem atual em basis points (necessário para MARGEM_BAIXA). */
  currentMarginBps?: number;
}

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    private readonly repository: AlertasRepository,
    private readonly tenancy: TenancyService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── CRUD de Regras ──────────────────────────────────────────────────────────

  async createRule(dto: CreateAlertRuleDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);

    if (dto.product_id) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.product_id, unidade_id: unitId, active: true },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Produto não encontrado nesta unidade');
    }

    return this.repository.createRule({
      type: dto.type,
      name: dto.name,
      active: true,
      threshold_value: dto.threshold_value ?? 0,
      threshold_unit: dto.threshold_unit ?? AlertThresholdUnit.NENHUM,
      created_by: user.sub,
      unit: { connect: { id: unitId } },
      ...(dto.product_id ? { product: { connect: { id: dto.product_id } } } : {}),
    });
  }

  async findAllRules(
    filters: { type?: AlertType; active?: boolean },
    user: JwtSystemPayload,
  ) {
    const unitId = await this.tenancy.resolveUnitId(user);
    return this.repository.findAllRules(unitId, filters);
  }

  async findRuleById(id: string, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const rule = await this.repository.findRuleById(id, unitId);
    if (!rule) throw new NotFoundException('Regra de alerta não encontrada');
    return rule;
  }

  async updateRule(id: string, dto: UpdateAlertRuleDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const rule = await this.repository.findRuleById(id, unitId);
    if (!rule) throw new NotFoundException('Regra de alerta não encontrada');

    if (dto.product_id) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.product_id, unidade_id: unitId, active: true },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Produto não encontrado nesta unidade');
    }

    const updateData: Prisma.AlertRuleUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.threshold_value !== undefined) updateData.threshold_value = dto.threshold_value;
    if (dto.threshold_unit !== undefined) updateData.threshold_unit = dto.threshold_unit;
    if (dto.product_id !== undefined) {
      updateData.product = dto.product_id
        ? { connect: { id: dto.product_id } }
        : { disconnect: true };
    }

    return this.repository.updateRule(id, unitId, updateData);
  }

  async deleteRule(id: string, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    const rule = await this.repository.findRuleById(id, unitId);
    if (!rule) throw new NotFoundException('Regra de alerta não encontrada');
    await this.repository.deleteRule(id, unitId);
    return { deleted: true };
  }

  // ─── Consulta de Eventos ─────────────────────────────────────────────────────

  async findAllEvents(query: QueryAlertEventDto, user: JwtSystemPayload) {
    const unitId = await this.tenancy.resolveUnitId(user);
    return this.repository.findAllEvents(
      unitId,
      {
        type: query.type,
        product_id: query.product_id,
        data_inicio: query.data_inicio ? new Date(query.data_inicio) : undefined,
        data_fim: query.data_fim ? new Date(query.data_fim) : undefined,
      },
      { page: query.page ?? 1, limit: query.limit ?? 20 },
    );
  }

  // ─── Dispatcher ──────────────────────────────────────────────────────────────

  /**
   * Dispatcher principal — chamado internamente por outros serviços.
   *
   * Fire-and-forget: erros são capturados e logados sem propagar ao caller.
   * Nunca `await` este método dentro de loops que possam ser lentos — use
   * `.catch(() => undefined)` conforme instruído no ponto de chamada.
   */
  async dispatch(type: AlertType, ctx: DispatchContext): Promise<void> {
    try {
      const rules = await this.repository.findActiveRulesByType(ctx.unitId, type, ctx.productId);
      if (rules.length === 0) return;

      for (const rule of rules) {
        const shouldFire = this.evaluateRule(
          rule.type,
          rule.threshold_value,
          rule.threshold_unit,
          ctx,
        );
        if (!shouldFire) continue;

        const message = this.buildMessage(type, rule.threshold_value, rule.threshold_unit, ctx);
        const contextId = ctx.productId ?? ctx.vendaId ?? ctx.couponId ?? null;
        const contextType = ctx.productId
          ? 'product'
          : ctx.vendaId
            ? 'venda'
            : ctx.couponId
              ? 'coupon'
              : null;

        await this.repository.createEvent({
          type,
          message,
          unidade_id: ctx.unitId,
          ...(contextId !== null ? { context_id: contextId } : {}),
          ...(contextType !== null ? { context_type: contextType } : {}),
          rule: { connect: { id: rule.id } },
        });
      }
    } catch (err) {
      // Dispatcher nunca propaga erros ao caller
      this.logger.warn(
        `dispatch(${type}) falhou silenciosamente: ${(err as Error).message}`,
      );
    }
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────────

  private evaluateRule(
    type: AlertType,
    thresholdValue: number,
    _thresholdUnit: AlertThresholdUnit,
    ctx: DispatchContext,
  ): boolean {
    switch (type) {
      case AlertType.ESTOQUE_BAIXO:
        if (ctx.currentStock === undefined) return false;
        return ctx.currentStock < thresholdValue;

      case AlertType.MARGEM_BAIXA:
        if (ctx.currentMarginBps === undefined) return false;
        return ctx.currentMarginBps < thresholdValue;

      case AlertType.VENDA_FINALIZADA:
        return true;

      case AlertType.CUPOM_ESGOTADO:
        return true;

      default:
        return false;
    }
  }

  private buildMessage(
    type: AlertType,
    thresholdValue: number,
    _thresholdUnit: AlertThresholdUnit,
    ctx: DispatchContext,
  ): string {
    switch (type) {
      case AlertType.ESTOQUE_BAIXO:
        return `Estoque baixo: saldo atual ${ctx.currentStock ?? '?'} unidade(s) (limite: ${thresholdValue})`;

      case AlertType.MARGEM_BAIXA:
        return `Margem baixa: ${((ctx.currentMarginBps ?? 0) / 100).toFixed(1)}% (limite: ${(thresholdValue / 100).toFixed(1)}%)`;

      case AlertType.VENDA_FINALIZADA:
        return `Venda finalizada: ${ctx.vendaId}`;

      case AlertType.CUPOM_ESGOTADO:
        return `Cupom esgotado: ${ctx.couponId}`;

      default:
        return 'Alerta disparado';
    }
  }
}
