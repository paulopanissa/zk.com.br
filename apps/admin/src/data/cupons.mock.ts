export type CouponType = 'FIXO' | 'PERCENTUAL' | 'FRETE_GRATIS'

export interface CupomMock {
  id: string
  code: string
  type: CouponType
  valueCentavos: number
  percentBps: number
  description: string
  active: boolean
  maxUses: number | null
  usesCount: number
  validFrom: string | null
  validUntil: string | null
  createdAt: string
}

export type CupomStatus = 'ativo' | 'inativo' | 'expirado' | 'esgotado'

export function getCupomStatus(c: CupomMock): CupomStatus {
  const now = new Date()
  if (!c.active) return 'inativo'
  if (c.validUntil && new Date(c.validUntil) < now) return 'expirado'
  if (c.maxUses !== null && c.usesCount >= c.maxUses) return 'esgotado'
  return 'ativo'
}

export function formatDesconto(c: CupomMock): string {
  if (c.type === 'FRETE_GRATIS') return 'Frete grátis'
  if (c.type === 'PERCENTUAL') return `${(c.percentBps / 100).toFixed(0)}%`
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valueCentavos / 100)
}

export const CUPONS_MOCK: CupomMock[] = [
  {
    id: '1',
    code: 'BEMVINDO10',
    type: 'PERCENTUAL',
    valueCentavos: 0,
    percentBps: 1000,
    description: '10% de desconto para novos clientes',
    active: true,
    maxUses: null,
    usesCount: 47,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    createdAt: '2026-01-01T00:00:00',
  },
  {
    id: '2',
    code: 'FRETEGRATIS',
    type: 'FRETE_GRATIS',
    valueCentavos: 0,
    percentBps: 0,
    description: 'Frete grátis para compras acima de R$100',
    active: true,
    maxUses: 100,
    usesCount: 72,
    validFrom: '2026-06-01',
    validUntil: '2026-06-30',
    createdAt: '2026-05-28T10:00:00',
  },
  {
    id: '3',
    code: 'NATAL25',
    type: 'PERCENTUAL',
    valueCentavos: 0,
    percentBps: 2500,
    description: 'Promoção de Natal — 25% em toda loja',
    active: false,
    maxUses: 200,
    usesCount: 198,
    validFrom: '2025-12-20',
    validUntil: '2025-12-31',
    createdAt: '2025-12-15T08:00:00',
  },
  {
    id: '4',
    code: 'MORDEDOR5',
    type: 'FIXO',
    valueCentavos: 500,
    percentBps: 0,
    description: 'R$5 de desconto em mordedores',
    active: true,
    maxUses: 50,
    usesCount: 50,
    validFrom: '2026-05-01',
    validUntil: '2026-07-01',
    createdAt: '2026-04-30T12:00:00',
  },
  {
    id: '5',
    code: 'JUNHO15',
    type: 'PERCENTUAL',
    valueCentavos: 0,
    percentBps: 1500,
    description: '15% de desconto em junho',
    active: true,
    maxUses: null,
    usesCount: 31,
    validFrom: '2026-06-01',
    validUntil: '2026-06-30',
    createdAt: '2026-05-31T18:00:00',
  },
  {
    id: '6',
    code: 'PRIMEIRACOMPRA',
    type: 'FIXO',
    valueCentavos: 1000,
    percentBps: 0,
    description: 'R$10 na primeira compra no e-commerce',
    active: true,
    maxUses: null,
    usesCount: 23,
    validFrom: null,
    validUntil: null,
    createdAt: '2026-03-01T09:00:00',
  },
  {
    id: '7',
    code: 'EXPIRADO2025',
    type: 'PERCENTUAL',
    valueCentavos: 0,
    percentBps: 2000,
    description: 'Promoção 2025 expirada',
    active: true,
    maxUses: null,
    usesCount: 5,
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
    createdAt: '2025-01-01T00:00:00',
  },
]
