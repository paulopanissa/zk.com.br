export type StockMovementType =
  | 'PURCHASE_ENTRY'
  | 'PURCHASE_CANCEL'
  | 'SALE_OUT'
  | 'SALE_RETURN'
  | 'MANUAL_ENTRY'
  | 'MANUAL_EXIT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'

export type LoteStatus = 'normal' | 'critico' | 'vencido'

export interface LoteMock {
  id: string
  productId: string
  productName: string
  sku: string
  code: string
  expiresAt: string | null
  quantityReceived: number
  quantityAvailable: number
  active: boolean
  notes: string | null
  createdAt: string
}

export interface MovimentacaoMock {
  id: string
  productId: string
  productName: string
  sku: string
  lotCode: string
  type: StockMovementType
  quantity: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  createdAt: string
  createdBy: string
}

export function getLoteStatus(l: LoteMock): LoteStatus {
  if (l.expiresAt && new Date(l.expiresAt) < new Date()) return 'vencido'
  if (l.quantityAvailable <= 5) return 'critico'
  return 'normal'
}

const TIPO_LABEL: Record<StockMovementType, string> = {
  PURCHASE_ENTRY: 'Entrada compra',
  PURCHASE_CANCEL: 'Cancelamento compra',
  SALE_OUT: 'Saída venda',
  SALE_RETURN: 'Devolução venda',
  MANUAL_ENTRY: 'Entrada manual',
  MANUAL_EXIT: 'Saída manual',
  TRANSFER_OUT: 'Transferência saída',
  TRANSFER_IN: 'Transferência entrada',
}

export function formatMovimentacaoTipo(type: StockMovementType): string {
  return TIPO_LABEL[type]
}

export function isEntrada(type: StockMovementType): boolean {
  return type === 'PURCHASE_ENTRY' || type === 'SALE_RETURN' || type === 'MANUAL_ENTRY' || type === 'TRANSFER_IN'
}

export const LOTES_MOCK: LoteMock[] = [
  {
    id: '1',
    productId: 'p1',
    productName: 'Ração Golden Adulto 15kg',
    sku: 'RAC-GLD-15',
    code: 'LOT-2026-001',
    expiresAt: '2027-03-01',
    quantityReceived: 120,
    quantityAvailable: 87,
    active: true,
    notes: null,
    createdAt: '2026-01-10T08:00:00',
  },
  {
    id: '2',
    productId: 'p2',
    productName: 'Ração Hills Filhote 3kg',
    sku: 'RAC-HLS-3',
    code: 'LOT-2026-002',
    expiresAt: '2027-06-15',
    quantityReceived: 60,
    quantityAvailable: 42,
    active: true,
    notes: null,
    createdAt: '2026-02-05T09:00:00',
  },
  {
    id: '3',
    productId: 'p3',
    productName: 'Antipulgas Frontline Plus Cães',
    sku: 'MED-FRL-C',
    code: 'LOT-2026-003',
    expiresAt: '2026-09-30',
    quantityReceived: 50,
    quantityAvailable: 18,
    active: true,
    notes: 'Lote próximo ao vencimento',
    createdAt: '2026-03-01T10:00:00',
  },
  {
    id: '4',
    productId: 'p4',
    productName: 'Brinquedo Mordedor Borracha',
    sku: 'BRQ-MRD-01',
    code: 'LOT-2026-004',
    expiresAt: null,
    quantityReceived: 30,
    quantityAvailable: 4,
    active: true,
    notes: null,
    createdAt: '2026-03-15T11:00:00',
  },
  {
    id: '5',
    productId: 'p5',
    productName: 'Areia Sanitária Premium 4kg',
    sku: 'ACE-ARN-4',
    code: 'LOT-2026-005',
    expiresAt: '2028-01-01',
    quantityReceived: 200,
    quantityAvailable: 156,
    active: true,
    notes: null,
    createdAt: '2026-04-01T07:00:00',
  },
  {
    id: '6',
    productId: 'p3',
    productName: 'Antipulgas Frontline Plus Cães',
    sku: 'MED-FRL-C',
    code: 'LOT-2025-098',
    expiresAt: '2025-12-31',
    quantityReceived: 40,
    quantityAvailable: 3,
    active: true,
    notes: 'Lote vencido — aguardando descarte',
    createdAt: '2025-10-01T08:00:00',
  },
  {
    id: '7',
    productId: 'p6',
    productName: 'Coleira Anti-Pulgas 8 meses',
    sku: 'ACE-CPL-8',
    code: 'LOT-2026-006',
    expiresAt: '2027-12-01',
    quantityReceived: 80,
    quantityAvailable: 2,
    active: true,
    notes: null,
    createdAt: '2026-04-20T09:00:00',
  },
  {
    id: '8',
    productId: 'p7',
    productName: 'Shampoo Pet Clean 500ml',
    sku: 'HIG-SPC-500',
    code: 'LOT-2026-007',
    expiresAt: '2027-08-15',
    quantityReceived: 100,
    quantityAvailable: 71,
    active: true,
    notes: null,
    createdAt: '2026-05-01T10:00:00',
  },
  {
    id: '9',
    productId: 'p8',
    productName: 'Ração Royal Canin Gato 7.5kg',
    sku: 'RAC-RCG-75',
    code: 'LOT-2026-008',
    expiresAt: '2026-11-30',
    quantityReceived: 45,
    quantityAvailable: 0,
    active: false,
    notes: 'Esgotado — aguardando reposição',
    createdAt: '2026-05-10T11:00:00',
  },
  {
    id: '10',
    productId: 'p1',
    productName: 'Ração Golden Adulto 15kg',
    sku: 'RAC-GLD-15',
    code: 'LOT-2026-010',
    expiresAt: '2027-06-01',
    quantityReceived: 150,
    quantityAvailable: 150,
    active: true,
    notes: 'Lote recém chegado',
    createdAt: '2026-06-15T08:00:00',
  },
  {
    id: '11',
    productId: 'p9',
    productName: 'Petisco Bifinho 500g',
    sku: 'TRT-BFN-500',
    code: 'LOT-2026-011',
    expiresAt: '2026-10-01',
    quantityReceived: 90,
    quantityAvailable: 67,
    active: true,
    notes: null,
    createdAt: '2026-06-01T09:00:00',
  },
  {
    id: '12',
    productId: 'p10',
    productName: 'Bebedouro Automático 1.5L',
    sku: 'ACE-BDA-15',
    code: 'LOT-2026-012',
    expiresAt: null,
    quantityReceived: 25,
    quantityAvailable: 19,
    active: true,
    notes: null,
    createdAt: '2026-06-10T14:00:00',
  },
]

export const MOVIMENTACOES_MOCK: MovimentacaoMock[] = [
  {
    id: 'm1',
    productId: 'p1',
    productName: 'Ração Golden Adulto 15kg',
    sku: 'RAC-GLD-15',
    lotCode: 'LOT-2026-001',
    type: 'PURCHASE_ENTRY',
    quantity: 120,
    referenceType: 'NfEntrada',
    referenceId: 'NF-2026-0042',
    notes: null,
    createdAt: '2026-01-10T08:30:00',
    createdBy: 'Carlos Souza',
  },
  {
    id: 'm2',
    productId: 'p2',
    productName: 'Ração Hills Filhote 3kg',
    sku: 'RAC-HLS-3',
    lotCode: 'LOT-2026-002',
    type: 'PURCHASE_ENTRY',
    quantity: 60,
    referenceType: 'NfEntrada',
    referenceId: 'NF-2026-0043',
    notes: null,
    createdAt: '2026-02-05T09:15:00',
    createdBy: 'Carlos Souza',
  },
  {
    id: 'm3',
    productId: 'p1',
    productName: 'Ração Golden Adulto 15kg',
    sku: 'RAC-GLD-15',
    lotCode: 'LOT-2026-001',
    type: 'SALE_OUT',
    quantity: -15,
    referenceType: 'Venda',
    referenceId: 'VND-2026-0120',
    notes: null,
    createdAt: '2026-02-20T14:00:00',
    createdBy: 'Sistema PDV',
  },
  {
    id: 'm4',
    productId: 'p3',
    productName: 'Antipulgas Frontline Plus Cães',
    sku: 'MED-FRL-C',
    lotCode: 'LOT-2026-003',
    type: 'PURCHASE_ENTRY',
    quantity: 50,
    referenceType: 'NfEntrada',
    referenceId: 'NF-2026-0051',
    notes: null,
    createdAt: '2026-03-01T10:00:00',
    createdBy: 'Carlos Souza',
  },
  {
    id: 'm5',
    productId: 'p3',
    productName: 'Antipulgas Frontline Plus Cães',
    sku: 'MED-FRL-C',
    lotCode: 'LOT-2026-003',
    type: 'SALE_OUT',
    quantity: -32,
    referenceType: 'Venda',
    referenceId: 'VND-2026-0201',
    notes: null,
    createdAt: '2026-04-10T16:30:00',
    createdBy: 'Sistema PDV',
  },
  {
    id: 'm6',
    productId: 'p4',
    productName: 'Brinquedo Mordedor Borracha',
    sku: 'BRQ-MRD-01',
    lotCode: 'LOT-2026-004',
    type: 'MANUAL_EXIT',
    quantity: -2,
    referenceType: null,
    referenceId: null,
    notes: 'Avaria — descartado',
    createdAt: '2026-04-15T11:00:00',
    createdBy: 'Ana Lima',
  },
  {
    id: 'm7',
    productId: 'p5',
    productName: 'Areia Sanitária Premium 4kg',
    sku: 'ACE-ARN-4',
    lotCode: 'LOT-2026-005',
    type: 'PURCHASE_ENTRY',
    quantity: 200,
    referenceType: 'NfEntrada',
    referenceId: 'NF-2026-0060',
    notes: null,
    createdAt: '2026-04-01T07:30:00',
    createdBy: 'Carlos Souza',
  },
  {
    id: 'm8',
    productId: 'p5',
    productName: 'Areia Sanitária Premium 4kg',
    sku: 'ACE-ARN-4',
    lotCode: 'LOT-2026-005',
    type: 'SALE_RETURN',
    quantity: 4,
    referenceType: 'Venda',
    referenceId: 'VND-2026-0190',
    notes: 'Devolução — produto intacto',
    createdAt: '2026-05-03T10:00:00',
    createdBy: 'Sistema PDV',
  },
  {
    id: 'm9',
    productId: 'p6',
    productName: 'Coleira Anti-Pulgas 8 meses',
    sku: 'ACE-CPL-8',
    lotCode: 'LOT-2026-006',
    type: 'MANUAL_ENTRY',
    quantity: 10,
    referenceType: null,
    referenceId: null,
    notes: 'Ajuste de inventário',
    createdAt: '2026-05-20T15:00:00',
    createdBy: 'Ana Lima',
  },
  {
    id: 'm10',
    productId: 'p7',
    productName: 'Shampoo Pet Clean 500ml',
    sku: 'HIG-SPC-500',
    lotCode: 'LOT-2026-007',
    type: 'PURCHASE_ENTRY',
    quantity: 100,
    referenceType: 'NfEntrada',
    referenceId: 'NF-2026-0072',
    notes: null,
    createdAt: '2026-05-01T10:30:00',
    createdBy: 'Carlos Souza',
  },
  {
    id: 'm11',
    productId: 'p8',
    productName: 'Ração Royal Canin Gato 7.5kg',
    sku: 'RAC-RCG-75',
    lotCode: 'LOT-2026-008',
    type: 'TRANSFER_IN',
    quantity: 45,
    referenceType: 'Transferencia',
    referenceId: 'TRF-2026-001',
    notes: 'Transferência da unidade Centro',
    createdAt: '2026-05-10T11:00:00',
    createdBy: 'Sistema',
  },
  {
    id: 'm12',
    productId: 'p8',
    productName: 'Ração Royal Canin Gato 7.5kg',
    sku: 'RAC-RCG-75',
    lotCode: 'LOT-2026-008',
    type: 'SALE_OUT',
    quantity: -45,
    referenceType: 'Venda',
    referenceId: 'VND-2026-0350',
    notes: null,
    createdAt: '2026-06-01T18:00:00',
    createdBy: 'Sistema PDV',
  },
  {
    id: 'm13',
    productId: 'p9',
    productName: 'Petisco Bifinho 500g',
    sku: 'TRT-BFN-500',
    lotCode: 'LOT-2026-011',
    type: 'PURCHASE_ENTRY',
    quantity: 90,
    referenceType: 'NfEntrada',
    referenceId: 'NF-2026-0081',
    notes: null,
    createdAt: '2026-06-01T09:30:00',
    createdBy: 'Carlos Souza',
  },
  {
    id: 'm14',
    productId: 'p1',
    productName: 'Ração Golden Adulto 15kg',
    sku: 'RAC-GLD-15',
    lotCode: 'LOT-2026-010',
    type: 'PURCHASE_ENTRY',
    quantity: 150,
    referenceType: 'NfEntrada',
    referenceId: 'NF-2026-0090',
    notes: null,
    createdAt: '2026-06-15T08:30:00',
    createdBy: 'Carlos Souza',
  },
  {
    id: 'm15',
    productId: 'p3',
    productName: 'Antipulgas Frontline Plus Cães',
    sku: 'MED-FRL-C',
    lotCode: 'LOT-2025-098',
    type: 'PURCHASE_CANCEL',
    quantity: -40,
    referenceType: 'NfEntrada',
    referenceId: 'NF-2025-0098',
    notes: 'NF cancelada pelo fornecedor',
    createdAt: '2025-10-15T14:00:00',
    createdBy: 'Carlos Souza',
  },
]
