export type MetodoPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'MAQUININHA_POINT'

export interface ResumoTurno {
  totalTransacoes: number
  totalCentavos: number
  porMetodo: Record<MetodoPagamento, number>
}

export const METODO_LABEL: Record<MetodoPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_DEBITO: 'Débito',
  CARTAO_CREDITO: 'Crédito',
  MAQUININHA_POINT: 'Maquininha',
}

export const RESUMO_TURNO_MOCK: ResumoTurno = {
  totalTransacoes: 14,
  totalCentavos: 73450,
  porMetodo: {
    DINHEIRO: 18500,
    PIX: 22000,
    CARTAO_DEBITO: 15750,
    CARTAO_CREDITO: 12200,
    MAQUININHA_POINT: 5000,
  },
}
