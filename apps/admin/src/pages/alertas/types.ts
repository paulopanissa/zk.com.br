// ─── Enums ────────────────────────────────────────────────────────────────────

export type AlertType = 'ESTOQUE_BAIXO' | 'MARGEM_BAIXA' | 'VENDA_FINALIZADA' | 'CUPOM_ESGOTADO'
export type AlertThresholdUnit = 'UNIDADES' | 'BPS' | 'NENHUM'

// ─── API response types ────────────────────────────────────────────────────────

export interface AlertaRegra {
  id: string
  type: AlertType
  name: string
  active: boolean
  threshold_value: number
  threshold_unit: AlertThresholdUnit
  product_id: string | null
  product: { id: string; name: string; sku: string | null } | null
  created_at: string
  updated_at: string
}

export interface AlertaEvento {
  id: string
  rule_id: string
  type: AlertType
  context_id: string | null
  context_type: string | null
  message: string
  created_at: string
  rule: { id: string; name: string; type: AlertType }
}

export interface AlertaEventosResponse {
  data: AlertaEvento[]
  total: number
  page: number
  limit: number
}

// ─── Display config ───────────────────────────────────────────────────────────

export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; badgeClass: string }> = {
  ESTOQUE_BAIXO:    { label: 'Estoque Baixo',    badgeClass: 'border-destructive/40 bg-destructive/10 text-destructive' },
  MARGEM_BAIXA:     { label: 'Margem Baixa',     badgeClass: 'border-warning/40 bg-warning/10 text-warning' },
  VENDA_FINALIZADA: { label: 'Venda Finalizada', badgeClass: 'border-success/40 bg-success/10 text-success' },
  CUPOM_ESGOTADO:   { label: 'Cupom Esgotado',   badgeClass: 'border-brand-ochre/40 bg-brand-ochre/10 text-brand-ochre' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatThreshold(value: number, unit: AlertThresholdUnit): string {
  if (unit === 'NENHUM') return '—'
  if (unit === 'BPS') return `${(value / 100).toFixed(1)}%`
  return `${value} un.`
}

export function hasThreshold(type: AlertType): boolean {
  return type === 'ESTOQUE_BAIXO' || type === 'MARGEM_BAIXA'
}

export const DEFAULT_THRESHOLD: Record<AlertType, { value: number; unit: AlertThresholdUnit }> = {
  ESTOQUE_BAIXO:    { value: 5,    unit: 'UNIDADES' },
  MARGEM_BAIXA:     { value: 1500, unit: 'BPS' },
  VENDA_FINALIZADA: { value: 0,    unit: 'NENHUM' },
  CUPOM_ESGOTADO:   { value: 0,    unit: 'NENHUM' },
}
