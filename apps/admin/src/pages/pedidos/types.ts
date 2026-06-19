// ─── Enums ────────────────────────────────────────────────────────────────────

export type VendaStatus = 'ABERTA' | 'FINALIZADA' | 'CANCELADA'
export type VendaOrigem = 'PDV' | 'ECOMMERCE' | 'PDV_OFFLINE'
export type PaymentMethod =
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'PIX'
  | 'BOLETO'
  | 'DINHEIRO'
  | 'MAQUININHA_POINT'
export type VendaPaymentStatus = 'PENDENTE' | 'PAGO' | 'CANCELADO'

// ─── API response types ────────────────────────────────────────────────────────

export interface VendaListItem {
  id: string
  numero: number
  status: VendaStatus
  origem: VendaOrigem
  total_bruto_centavos: number
  total_liquido_centavos: number
  desconto_total_centavos: number
  created_at: string
  finalizada_em: string | null
  cancelada_em: string | null
  sync_id: string | null
  observacao: string | null
  cliente: { id: string; nome: string; telefone_principal: string | null } | null
  _count: { items: number }
}

export interface VendaItemApi {
  id: string
  product: { id: string; name: string; sku: string | null; barcode: string | null }
  numero_item: number
  quantidade: string | number
  preco_unitario_centavos: number
  desconto_item_centavos: number
  total_centavos: number
}

export interface VendaPaymentApi {
  id: string
  metodo: PaymentMethod
  valor_centavos: number
  status: VendaPaymentStatus
  troco_centavos: number
  pago_em: string | null
  created_at: string
}

export interface VendaDetail extends VendaListItem {
  items: VendaItemApi[]
  payments: VendaPaymentApi[]
}

export interface VendaPageResponse {
  data: VendaListItem[]
  total: number
  page: number
  limit: number
}

// ─── Display config ───────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<VendaStatus, { label: string; className: string; rowClass: string }> = {
  ABERTA:     { label: 'Aberta',     className: 'border-primary/40 bg-primary/10 text-primary',         rowClass: 'bg-primary/5' },
  FINALIZADA: { label: 'Finalizada', className: 'border-success/40 bg-success/10 text-success',         rowClass: '' },
  CANCELADA:  { label: 'Cancelada',  className: 'border-destructive/40 bg-destructive/10 text-destructive', rowClass: 'opacity-60' },
}

export const ORIGEM_CONFIG: Record<VendaOrigem, { label: string; className: string }> = {
  PDV:         { label: 'PDV',         className: 'border-brand-ochre/40 bg-brand-ochre/10 text-brand-ochre' },
  ECOMMERCE:   { label: 'E-commerce',  className: 'border-brand-forest/40 bg-brand-forest/10 text-brand-forest' },
  PDV_OFFLINE: { label: 'PDV Offline', className: 'border-warning/40 bg-warning/10 text-warning' },
}

export const PAYMENT_STATUS_CONFIG: Record<VendaPaymentStatus, { label: string; className: string }> = {
  PAGO:      { label: 'Pago',      className: 'border-success/40 bg-success/10 text-success' },
  PENDENTE:  { label: 'Pendente',  className: 'border-warning/40 bg-warning/10 text-warning' },
  CANCELADO: { label: 'Cancelado', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  DINHEIRO: 'Dinheiro',
  MAQUININHA_POINT: 'Maquininha Point',
}

export function formatPaymentMethod(m: PaymentMethod): string {
  return PAYMENT_METHOD_LABEL[m] ?? m
}

export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

export function formatQty(qty: string | number): string {
  const n = typeof qty === 'string' ? parseFloat(qty) : qty
  return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}
