import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PricingInputDto } from './dto/pricing-input.dto';
import { PricingResultDto } from './dto/pricing-result.dto';

/**
 * PricingEngineService — cálculo puro de preço e margem.
 * Sem injeção de banco, sem repositório. Toda aritmética em inteiros (centavos / basis points).
 * Pode ser injetado por ProductsModule, PDV e qualquer outro módulo que precise de cálculo de preço.
 *
 * Metodologia: Mark-up Inverso (SEBRAE)
 * Todas as despesas variáveis (impostos, taxa cartão, comissão, custos variáveis) incidem sobre
 * o PREÇO DE VENDA, não sobre o custo. A fórmula é:
 *
 *   PV = CMV / (1 - DV% - ML%)
 *
 * Onde CMV = custo_compra + frete_entrada + custo_fixo_rateado
 * e DV% = impostos% + taxa_cartão% + comissão% + custo_variavel% (todos sobre PV)
 */
@Injectable()
export class PricingEngineService {
  /**
   * Calcula o preço sugerido e a margem real dado um conjunto de inputs de custo.
   *
   * Invariantes:
   * - Toda aritmética é inteira. NUNCA float.
   * - Math.floor() nas parcelas variáveis (calculadas sobre PV) para não inflar.
   * - Math.ceil() no preço sugerido (para garantir cobertura do custo).
   * - (dv_total_bps + margem_desejada_bps) >= 10000 é impossível matematicamente.
   */
  calculate(dto: PricingInputDto): PricingResultDto {
    const {
      preco_custo_centavos,
      impostos_bps = 0,
      frete_centavos = 0,
      custo_operacional_centavos = 0,
      custo_operacional_variavel_bps = 0,
      taxa_cartao_bps = 0,
      comissao_bps = 0,
      margem_desejada_bps = 0,
    } = dto;

    // Total de despesas variáveis sobre o preço de venda (basis points)
    const dv_total_bps =
      impostos_bps + custo_operacional_variavel_bps + taxa_cartao_bps + comissao_bps;

    // Guarda: a soma de DV + margem deve ser < 10000 (= 100%)
    if (dv_total_bps + margem_desejada_bps >= 10000) {
      throw new UnprocessableEntityException(
        'A soma de despesas variáveis (impostos + taxa cartão + comissão + custos variáveis) ' +
          'e margem desejada deve ser menor que 100%. ' +
          `Valor recebido: ${((dv_total_bps + margem_desejada_bps) / 100).toFixed(2)}%.`,
      );
    }

    // ── Passo 1: custo base (fixo — não depende do PV) ─────────────────────────
    const custo_base =
      preco_custo_centavos + frete_centavos + custo_operacional_centavos;

    // ── Passo 2: preço sugerido via mark-up inverso ─────────────────────────────
    // PV = custo_base / (1 - DV% - ML%)
    // Em basis points: PV = custo_base × 10000 / (10000 - dv_total_bps - margem_desejada_bps)
    const divisor = 10000 - dv_total_bps - margem_desejada_bps;
    const preco_sugerido = Math.ceil((custo_base * 10000) / divisor);

    // ── Passo 3: breakdown — cada componente variável calculado sobre o PV ──────
    // (floor para não somar mais do que o PV comporta)
    const custo_impostos = Math.floor((preco_sugerido * impostos_bps) / 10000);
    const custo_operacional_var = Math.floor(
      (preco_sugerido * custo_operacional_variavel_bps) / 10000,
    );
    const custo_cartao = Math.floor((preco_sugerido * taxa_cartao_bps) / 10000);
    const custo_comissao = Math.floor((preco_sugerido * comissao_bps) / 10000);

    // ── Passo 4: margem real ─────────────────────────────────────────────────────
    const custo_total =
      custo_base + custo_impostos + custo_operacional_var + custo_cartao + custo_comissao;
    const margem_reais = preco_sugerido - custo_total;
    const margem_percentual_bps =
      preco_sugerido > 0 ? Math.floor((margem_reais * 10000) / preco_sugerido) : 0;

    return {
      custo_total_centavos: custo_total,
      preco_sugerido_centavos: preco_sugerido,
      margem_reais_centavos: margem_reais,
      margem_percentual_bps,
      breakdown: {
        custo_base_centavos: custo_base,
        custo_impostos_centavos: custo_impostos,
        custo_operacional_var_centavos: custo_operacional_var,
        custo_cartao_centavos: custo_cartao,
        custo_comissao_centavos: custo_comissao,
        frete_centavos,
      },
    };
  }
}
