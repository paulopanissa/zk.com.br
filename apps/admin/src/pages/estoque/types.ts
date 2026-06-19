export type StockMovementType =
  | 'PURCHASE_ENTRY'
  | 'PURCHASE_CANCEL'
  | 'SALE_OUT'
  | 'SALE_RETURN'
  | 'MANUAL_ENTRY'
  | 'MANUAL_EXIT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'

export interface StockSummaryItem {
  product_id: string
  product_name: string
  product_sku: string | null
  min_stock: number
  category_id: string | null
  total_balance: number
  lot_count: number
  is_low_stock: boolean
}

export interface StockSummaryResponse {
  data: StockSummaryItem[]
  total: number
  page: number
  limit: number
}

export interface StockMovementLot {
  code: string
  expires_at: string | null
}

export interface StockMovementProduct {
  name: string
  sku: string | null
}

export interface StockMovement {
  id: string
  type: StockMovementType
  quantity: string
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  created_by: string
  created_at: string
  lot: StockMovementLot
  product: StockMovementProduct
}

export interface MovementsResponse {
  data: StockMovement[]
  total: number
  page: number
  limit: number
}

const TIPO_LABEL: Record<StockMovementType, string> = {
  PURCHASE_ENTRY:  'Entrada compra',
  PURCHASE_CANCEL: 'Cancelamento compra',
  SALE_OUT:        'Saída venda',
  SALE_RETURN:     'Devolução venda',
  MANUAL_ENTRY:    'Entrada manual',
  MANUAL_EXIT:     'Saída manual',
  TRANSFER_OUT:    'Transferência saída',
  TRANSFER_IN:     'Transferência entrada',
}

export function formatMovimentacaoTipo(type: StockMovementType): string {
  return TIPO_LABEL[type]
}

const ENTRADA_TYPES: StockMovementType[] = [
  'PURCHASE_ENTRY',
  'SALE_RETURN',
  'MANUAL_ENTRY',
  'TRANSFER_IN',
]

export function isEntrada(type: StockMovementType): boolean {
  return ENTRADA_TYPES.includes(type)
}
