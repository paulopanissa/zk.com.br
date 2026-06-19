export type CouponType = 'FIXO' | 'PERCENTUAL' | 'FRETE_GRATIS'
export type CupomStatus = 'ativo' | 'inativo' | 'expirado' | 'esgotado'

export interface Cupom {
  id: string
  code: string
  type: CouponType
  value_centavos: number
  percent_bps: number
  description: string | null
  active: boolean
  max_uses: number | null
  uses_count: number
  valid_from: string | null
  valid_until: string | null
  product?: { id: string; name: string; sku: string | null } | null
  created_at: string
  updated_at: string
}

export interface CuponsResponse {
  data: Cupom[]
  total: number
  page: number
  limit: number
}

export function getCupomStatus(c: Cupom): CupomStatus {
  if (!c.active) return 'inativo'
  if (c.valid_until && new Date(c.valid_until) < new Date()) return 'expirado'
  if (c.max_uses !== null && c.uses_count >= c.max_uses) return 'esgotado'
  return 'ativo'
}

export function formatDesconto(c: Cupom): string {
  if (c.type === 'FRETE_GRATIS') return 'Frete grátis'
  if (c.type === 'PERCENTUAL') return `${(c.percent_bps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.value_centavos / 100)
}

export const STATUS_CONFIG: Record<CupomStatus, { label: string; className: string }> = {
  ativo:    { label: 'Ativo',    className: 'border-success/40 bg-success/10 text-success' },
  inativo:  { label: 'Inativo',  className: 'border-border text-muted-foreground' },
  expirado: { label: 'Expirado', className: 'border-muted bg-muted/30 text-muted-foreground' },
  esgotado: { label: 'Esgotado', className: 'border-warning/40 bg-warning/10 text-warning' },
}

export const TIPO_LABEL: Record<CouponType, string> = {
  PERCENTUAL:   'Percentual',
  FIXO:         'Valor fixo',
  FRETE_GRATIS: 'Frete grátis',
}
