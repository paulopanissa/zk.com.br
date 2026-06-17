import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PricingInputDto } from './dto/pricing-input.dto';
import { PricingResultDto } from './dto/pricing-result.dto';

/**
 * PricingEngineService — cálculo puro de preço e margem.
 * Sem injeção de banco, sem repositório. Toda aritmética em inteiros (centavos / basis points).
 * Pode ser injetado por ProductsModule, PDV e qualquer outro módulo que precise de cálculo de preço.
 */
@Injectable()
export class PricingEngineService {
  /**
   * Calcula o preço sugerido e a margem real dado um conjunto de inputs de custo.
   *
   * Invariantes:
   * - Toda aritmética é inteira. NUNCA float.
   * - Math.floor() nas parcelas de custo (para não inflar o custo).
   * - Math.ceil() no preço sugerido (para garantir cobertura do custo).
   * - margem_desejada_bps >= 10000 é impossível matematicamente (divisão por zero ou negativo).
   */
  calculate(dto: PricingInputDto): PricingResultDto {
    const {
      preco_custo_centavos,
      impostos_bps = 0,
      frete_centavos = 0,
      custo_operacional_centavos = 0,
      custo_operacional_variavel_bps = 0,
      taxa_cartao_bps = 0,
      margem_desejada_bps = 0,
    } = dto;

    // Guarda de domínio — já enforçado pelo @Max(9999) no DTO, mas defensivo no service.
    if (margem_desejada_bps >= 10000) {
      throw new UnprocessableEntityException(
        'margem_desejada_bps deve ser menor que 10000 (100%). Uma margem de 100% implica custo zero.',
      );
    }

    // ── Passo 1: custo base ──────────────────────────────────────────────────
    const custo_base = preco_custo_centavos + frete_centavos + custo_operacional_centavos;

    // ── Passo 2: parcelas variáveis (floor para não inflar custo) ────────────
    const custo_impostos = Math.floor((custo_base * impostos_bps) / 10000);
    const custo_operacional_var = Math.floor((custo_base * custo_operacional_variavel_bps) / 10000);
    const custo_cartao = Math.floor((custo_base * taxa_cartao_bps) / 10000);

    // ── Passo 3: custo total ─────────────────────────────────────────────────
    const custo_total = custo_base + custo_impostos + custo_operacional_var + custo_cartao;

    // ── Passo 4: preço sugerido (ceil para cobrir custo) ─────────────────────
    // Fórmula: preco = custo / (1 - margem%)
    // Em basis points: preco = custo * 10000 / (10000 - margem_bps)
    const preco_sugerido =
      margem_desejada_bps === 0
        ? custo_total
        : Math.ceil((custo_total * 10000) / (10000 - margem_desejada_bps));

    // ── Passo 5: margem real ─────────────────────────────────────────────────
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
        frete_centavos,
      },
    };
  }
}
