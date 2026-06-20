export interface CostCenter {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
}

export interface CostCenterWithItems extends CostCenter {
  items: CostItem[]
}

export interface CostItem {
  id: string
  cost_center_id: string
  nome: string
  tipo: 'FIXO' | 'VARIAVEL'
  valor_centavos: number | null
  percentual_bps: number | null
  descricao: string | null
  ativo: boolean
}

export interface CenterSummary {
  total_fixo_centavos: number
  total_variavel_bps: number
}

export interface ItemFormState {
  nome: string
  tipo: 'FIXO' | 'VARIAVEL'
  valor: string
  descricao: string
}

export function extractError(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data
    ?.message
  return typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar'
}

export function fmtBrl(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

export function fmtPct(bps: number) {
  return `${(bps / 100).toFixed(2).replace('.', ',')}%`
}

export function computeSummary(items: CostItem[]): CenterSummary {
  return {
    total_fixo_centavos: items
      .filter((i) => i.ativo && i.tipo === 'FIXO')
      .reduce((sum, i) => sum + (i.valor_centavos ?? 0), 0),
    total_variavel_bps: items
      .filter((i) => i.ativo && i.tipo === 'VARIAVEL')
      .reduce((sum, i) => sum + (i.percentual_bps ?? 0), 0),
  }
}

export function buildItemForm(item?: CostItem): ItemFormState {
  if (!item) return { nome: '', tipo: 'FIXO', valor: '', descricao: '' }
  return {
    nome: item.nome,
    tipo: item.tipo,
    valor:
      item.tipo === 'FIXO'
        ? ((item.valor_centavos ?? 0) / 100).toFixed(2)
        : ((item.percentual_bps ?? 0) / 100).toFixed(2),
    descricao: item.descricao ?? '',
  }
}
