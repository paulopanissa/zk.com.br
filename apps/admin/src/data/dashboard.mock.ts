export interface VendasDia {
  data: string
  label: string
  total: number
  pedidos: number
}

export interface ProdutoTop {
  id: string
  nome: string
  sku: string
  vendidos: number
  receita: number
}

export interface AlertaDash {
  id: string
  tipo: 'estoque_critico' | 'caixa_fechado' | 'produto_inativo' | 'meta_atingida'
  mensagem: string
  criadoEm: string
  lido: boolean
}

export interface StatusCaixa {
  aberto: boolean
  operador: string
  abertoEm: string | null
  saldoAbertura: number
  totalVendas: number
  totalSangrias: number
}

export const VENDAS_7_DIAS: VendasDia[] = [
  { data: '2026-06-11', label: 'Qua', total: 187400, pedidos: 9 },
  { data: '2026-06-12', label: 'Qui', total: 241800, pedidos: 13 },
  { data: '2026-06-13', label: 'Sex', total: 318500, pedidos: 17 },
  { data: '2026-06-14', label: 'Sáb', total: 452300, pedidos: 24 },
  { data: '2026-06-15', label: 'Dom', total: 389700, pedidos: 21 },
  { data: '2026-06-16', label: 'Seg', total: 214600, pedidos: 11 },
  { data: '2026-06-17', label: 'Hoje', total: 178900, pedidos: 8 },
]

export const HOJE = VENDAS_7_DIAS[6]
export const ONTEM = VENDAS_7_DIAS[5]

export const TOP_PRODUTOS: ProdutoTop[] = [
  { id: '1', nome: 'Mordedor Osso Grande', sku: 'MOR-OSS-GR-001', vendidos: 24, receita: 155760 },
  { id: '2', nome: 'Petisco Frango Desidratado', sku: 'PET-FRG-DES-002', vendidos: 19, receita: 66500 },
  { id: '3', nome: 'Raiz de Café Premium', sku: 'MOR-RAF-CAF-004', vendidos: 15, receita: 149850 },
  { id: '4', nome: 'Jerky de Batata-Doce', sku: 'PET-JRK-BAT-008', vendidos: 12, receita: 47880 },
  { id: '5', nome: 'Kit Petiscos Naturais', sku: 'KIT-PET-NAT-005', vendidos: 9, receita: 98910 },
]

export const ALERTAS_RECENTES: AlertaDash[] = [
  {
    id: '1',
    tipo: 'estoque_critico',
    mensagem: 'Corda de Algodão Tripla — estoque em 2 un (mín: 5)',
    criadoEm: '2026-06-17T10:23:00',
    lido: false,
  },
  {
    id: '2',
    tipo: 'estoque_critico',
    mensagem: 'Osso Defumado Grande — estoque em 1 un (mín: 10)',
    criadoEm: '2026-06-17T09:11:00',
    lido: false,
  },
  {
    id: '3',
    tipo: 'meta_atingida',
    mensagem: 'Meta semanal de vendas atingida: R$ 1.704,50',
    criadoEm: '2026-06-16T18:45:00',
    lido: true,
  },
  {
    id: '4',
    tipo: 'caixa_fechado',
    mensagem: 'Caixa PDV fechado — saldo R$ 1.245,00',
    criadoEm: '2026-06-16T18:32:00',
    lido: true,
  },
  {
    id: '5',
    tipo: 'produto_inativo',
    mensagem: 'Shampoo de Aveia inativado automaticamente (estoque zerado)',
    criadoEm: '2026-06-15T14:07:00',
    lido: true,
  },
]

export const STATUS_CAIXA: StatusCaixa = {
  aberto: true,
  operador: 'Ana Paula',
  abertoEm: '2026-06-17T08:30:00',
  saldoAbertura: 20000,
  totalVendas: 178900,
  totalSangrias: 0,
}

export const ESTOQUE_CRITICO_COUNT = 3
