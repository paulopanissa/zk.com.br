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

export interface VendaMock {
  id: string
  numero: number
  status: VendaStatus
  origem: VendaOrigem
  clienteNome: string | null
  clienteId: string | null
  totalBrutoCentavos: number
  totalLiquidoCentavos: number
  descontoTotalCentavos: number
  itemsCount: number
  createdAt: string
  finalizadaEm: string | null
  canceladaEm: string | null
  createdBy: string
}

export interface VendaItemMock {
  id: string
  productName: string
  sku: string
  quantidade: number
  precoUnitarioCentavos: number
  descontoItemCentavos: number
  totalCentavos: number
}

export interface VendaPaymentMock {
  id: string
  metodo: PaymentMethod
  valorCentavos: number
  status: VendaPaymentStatus
  trocoCentavos: number
  pagoEm: string | null
}

export interface VendaDetalheMock extends VendaMock {
  observacao: string | null
  items: VendaItemMock[]
  payments: VendaPaymentMock[]
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
  return PAYMENT_METHOD_LABEL[m]
}

export const formatBRL = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)

export const PEDIDOS_MOCK: VendaMock[] = [
  {
    id: '1',
    numero: 1001,
    status: 'FINALIZADA',
    origem: 'PDV',
    clienteNome: 'Ana Paula Ferreira',
    clienteId: '1',
    totalBrutoCentavos: 18900,
    totalLiquidoCentavos: 17010,
    descontoTotalCentavos: 1890,
    itemsCount: 3,
    createdAt: '2026-06-17T10:30:00',
    finalizadaEm: '2026-06-17T10:45:00',
    canceladaEm: null,
    createdBy: 'Maria Operadora',
  },
  {
    id: '2',
    numero: 1002,
    status: 'FINALIZADA',
    origem: 'ECOMMERCE',
    clienteNome: 'Roberto Alves',
    clienteId: '2',
    totalBrutoCentavos: 34900,
    totalLiquidoCentavos: 34900,
    descontoTotalCentavos: 0,
    itemsCount: 2,
    createdAt: '2026-06-17T11:00:00',
    finalizadaEm: '2026-06-17T11:02:00',
    canceladaEm: null,
    createdBy: 'Sistema E-commerce',
  },
  {
    id: '3',
    numero: 1003,
    status: 'ABERTA',
    origem: 'PDV',
    clienteNome: null,
    clienteId: null,
    totalBrutoCentavos: 5500,
    totalLiquidoCentavos: 5500,
    descontoTotalCentavos: 0,
    itemsCount: 1,
    createdAt: '2026-06-17T14:20:00',
    finalizadaEm: null,
    canceladaEm: null,
    createdBy: 'João Caixa',
  },
  {
    id: '4',
    numero: 1004,
    status: 'CANCELADA',
    origem: 'ECOMMERCE',
    clienteNome: 'Carla Mendes',
    clienteId: '3',
    totalBrutoCentavos: 12900,
    totalLiquidoCentavos: 11610,
    descontoTotalCentavos: 1290,
    itemsCount: 2,
    createdAt: '2026-06-16T09:15:00',
    finalizadaEm: null,
    canceladaEm: '2026-06-16T14:00:00',
    createdBy: 'Sistema E-commerce',
  },
  {
    id: '5',
    numero: 1005,
    status: 'FINALIZADA',
    origem: 'PDV',
    clienteNome: 'Pedro Santos',
    clienteId: '4',
    totalBrutoCentavos: 8750,
    totalLiquidoCentavos: 8750,
    descontoTotalCentavos: 0,
    itemsCount: 2,
    createdAt: '2026-06-16T15:30:00',
    finalizadaEm: '2026-06-16T15:40:00',
    canceladaEm: null,
    createdBy: 'Maria Operadora',
  },
  {
    id: '6',
    numero: 1006,
    status: 'FINALIZADA',
    origem: 'PDV_OFFLINE',
    clienteNome: null,
    clienteId: null,
    totalBrutoCentavos: 4200,
    totalLiquidoCentavos: 4200,
    descontoTotalCentavos: 0,
    itemsCount: 1,
    createdAt: '2026-06-15T18:00:00',
    finalizadaEm: '2026-06-15T18:05:00',
    canceladaEm: null,
    createdBy: 'João Caixa',
  },
  {
    id: '7',
    numero: 1007,
    status: 'FINALIZADA',
    origem: 'ECOMMERCE',
    clienteNome: 'Fernanda Lima',
    clienteId: '5',
    totalBrutoCentavos: 67800,
    totalLiquidoCentavos: 60000,
    descontoTotalCentavos: 7800,
    itemsCount: 4,
    createdAt: '2026-06-15T10:00:00',
    finalizadaEm: '2026-06-15T10:02:00',
    canceladaEm: null,
    createdBy: 'Sistema E-commerce',
  },
  {
    id: '8',
    numero: 1008,
    status: 'ABERTA',
    origem: 'PDV',
    clienteNome: 'Marcos Costa',
    clienteId: '6',
    totalBrutoCentavos: 23500,
    totalLiquidoCentavos: 23500,
    descontoTotalCentavos: 0,
    itemsCount: 3,
    createdAt: '2026-06-18T09:00:00',
    finalizadaEm: null,
    canceladaEm: null,
    createdBy: 'Maria Operadora',
  },
  {
    id: '9',
    numero: 1009,
    status: 'CANCELADA',
    origem: 'PDV',
    clienteNome: null,
    clienteId: null,
    totalBrutoCentavos: 3300,
    totalLiquidoCentavos: 3300,
    descontoTotalCentavos: 0,
    itemsCount: 1,
    createdAt: '2026-06-14T13:00:00',
    finalizadaEm: null,
    canceladaEm: '2026-06-14T13:10:00',
    createdBy: 'João Caixa',
  },
  {
    id: '10',
    numero: 1010,
    status: 'FINALIZADA',
    origem: 'PDV_OFFLINE',
    clienteNome: 'Ana Paula Ferreira',
    clienteId: '1',
    totalBrutoCentavos: 15600,
    totalLiquidoCentavos: 14040,
    descontoTotalCentavos: 1560,
    itemsCount: 2,
    createdAt: '2026-06-13T16:00:00',
    finalizadaEm: '2026-06-13T16:10:00',
    canceladaEm: null,
    createdBy: 'João Caixa',
  },
  {
    id: '11',
    numero: 1011,
    status: 'FINALIZADA',
    origem: 'ECOMMERCE',
    clienteNome: 'Lucia Ramos',
    clienteId: '7',
    totalBrutoCentavos: 9800,
    totalLiquidoCentavos: 9800,
    descontoTotalCentavos: 0,
    itemsCount: 2,
    createdAt: '2026-06-12T11:00:00',
    finalizadaEm: '2026-06-12T11:01:00',
    canceladaEm: null,
    createdBy: 'Sistema E-commerce',
  },
  {
    id: '12',
    numero: 1012,
    status: 'FINALIZADA',
    origem: 'PDV',
    clienteNome: 'Pedro Santos',
    clienteId: '4',
    totalBrutoCentavos: 4400,
    totalLiquidoCentavos: 4400,
    descontoTotalCentavos: 0,
    itemsCount: 1,
    createdAt: '2026-06-11T14:30:00',
    finalizadaEm: '2026-06-11T14:35:00',
    canceladaEm: null,
    createdBy: 'Maria Operadora',
  },
]

function findById(id: string): VendaMock {
  const found = PEDIDOS_MOCK.find((p) => p.id === id)
  if (!found) throw new Error(`Mock pedido id=${id} not found`)
  return found
}

export const STATUS_CONFIG: Record<VendaStatus, { label: string; className: string }> = {
  ABERTA:     { label: 'Aberta',     className: 'border-blue-300/40 bg-blue-50 text-blue-700 dark:text-blue-400' },
  FINALIZADA: { label: 'Finalizada', className: 'border-success/40 bg-success/10 text-success' },
  CANCELADA:  { label: 'Cancelada',  className: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

export const ORIGEM_CONFIG: Record<VendaOrigem, { label: string; className: string }> = {
  PDV:         { label: 'PDV',         className: 'border-primary/40 bg-primary/10 text-primary' },
  ECOMMERCE:   { label: 'E-commerce',  className: 'border-purple-300/40 bg-purple-50 text-purple-700 dark:text-purple-400' },
  PDV_OFFLINE: { label: 'PDV Offline', className: 'border-warning/40 bg-warning/10 text-warning' },
}

export const PEDIDOS_DETALHE_MOCK: Record<string, VendaDetalheMock> = {
  '1': {
    ...findById('1'),
    observacao: 'Cliente solicitou embrulho para presente.',
    items: [
      { id: 'i1', productName: 'Ração Golden Adulto 15kg', sku: 'RAC-GLD-15', quantidade: 1, precoUnitarioCentavos: 12900, descontoItemCentavos: 0, totalCentavos: 12900 },
      { id: 'i2', productName: 'Petisco Bifinho 500g', sku: 'TRT-BFN-500', quantidade: 2, precoUnitarioCentavos: 2200, descontoItemCentavos: 0, totalCentavos: 4400 },
      { id: 'i3', productName: 'Coleira Anti-Pulgas 8 meses', sku: 'ACE-CPL-8', quantidade: 1, precoUnitarioCentavos: 1600, descontoItemCentavos: 1890, totalCentavos: 1710 },
    ],
    payments: [
      { id: 'pg1', metodo: 'CARTAO_CREDITO', valorCentavos: 17010, status: 'PAGO', trocoCentavos: 0, pagoEm: '2026-06-17T10:44:00' },
    ],
  },
  '2': {
    ...findById('2'),
    observacao: null,
    items: [
      { id: 'i4', productName: 'Ração Hills Filhote 3kg', sku: 'RAC-HLS-3', quantidade: 3, precoUnitarioCentavos: 8900, descontoItemCentavos: 0, totalCentavos: 26700 },
      { id: 'i5', productName: 'Shampoo Pet Clean 500ml', sku: 'HIG-SPC-500', quantidade: 2, precoUnitarioCentavos: 4100, descontoItemCentavos: 0, totalCentavos: 8200 },
    ],
    payments: [
      { id: 'pg2', metodo: 'PIX', valorCentavos: 34900, status: 'PAGO', trocoCentavos: 0, pagoEm: '2026-06-17T11:01:00' },
    ],
  },
  '3': {
    ...findById('3'),
    observacao: null,
    items: [
      { id: 'i6', productName: 'Areia Sanitária Premium 4kg', sku: 'ACE-ARN-4', quantidade: 1, precoUnitarioCentavos: 5500, descontoItemCentavos: 0, totalCentavos: 5500 },
    ],
    payments: [],
  },
  '7': {
    ...findById('7'),
    observacao: 'Entrega expressa solicitada.',
    items: [
      { id: 'i7', productName: 'Ração Royal Canin Gato 7.5kg', sku: 'RAC-RCG-75', quantidade: 2, precoUnitarioCentavos: 14900, descontoItemCentavos: 0, totalCentavos: 29800 },
      { id: 'i8', productName: 'Antipulgas Frontline Plus Cães', sku: 'MED-FRL-C', quantidade: 2, precoUnitarioCentavos: 8200, descontoItemCentavos: 0, totalCentavos: 16400 },
      { id: 'i9', productName: 'Bebedouro Automático 1.5L', sku: 'ACE-BDA-15', quantidade: 1, precoUnitarioCentavos: 12900, descontoItemCentavos: 0, totalCentavos: 12900 },
      { id: 'i10', productName: 'Brinquedo Mordedor Borracha', sku: 'BRQ-MRD-01', quantidade: 2, precoUnitarioCentavos: 4350, descontoItemCentavos: 7800, totalCentavos: 700 },
    ],
    payments: [
      { id: 'pg3', metodo: 'CARTAO_CREDITO', valorCentavos: 40000, status: 'PAGO', trocoCentavos: 0, pagoEm: '2026-06-15T10:01:30' },
      { id: 'pg4', metodo: 'PIX', valorCentavos: 20000, status: 'PAGO', trocoCentavos: 0, pagoEm: '2026-06-15T10:01:45' },
    ],
  },
}
