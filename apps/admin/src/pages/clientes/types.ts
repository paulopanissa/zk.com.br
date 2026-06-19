export interface Cliente {
  id: string
  unidade_id: string
  nome: string
  telefone_principal: string | null
  email: string | null
  dados_dinamicos: Record<string, unknown> | null
  consentimento_lgpd: boolean
  consentimento_versao: string | null
  consentimento_em: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface ClienteListResponse {
  data: Cliente[]
  total: number
  page: number
  limit: number
}

export interface VendaResumo {
  id: string
  numero: number
  status: 'ABERTA' | 'FINALIZADA' | 'CANCELADA'
  origem: 'PDV' | 'ECOMMERCE' | 'PDV_OFFLINE'
  total_liquido_centavos: number
  desconto_total_centavos: number
  created_at: string
  finalizada_em: string | null
}

export interface VendaResumoResponse {
  data: VendaResumo[]
  total: number
  page: number
  limit: number
}
