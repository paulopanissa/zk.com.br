export interface ProdutoMock {
  id: string
  imagem?: string
  nome: string
  sku: string
  categoria: string
  marca: string
  precoVenda: number // centavos
  precoCusto: number // centavos
  estoque: number
  estoqueMinimo: number
  ativo: boolean
  destaque: boolean
}

function margem(venda: number, custo: number): number {
  if (venda === 0) return 0
  return ((venda - custo) / venda) * 100
}

export function calcMargem(p: ProdutoMock) {
  return margem(p.precoVenda, p.precoCusto)
}

export const PRODUTOS_MOCK: ProdutoMock[] = [
  {
    id: '1',
    nome: 'Mordedor Natural Osso Grande',
    sku: 'MOR-001',
    categoria: 'Mordedores',
    marca: 'Z&K Original',
    precoVenda: 2890,
    precoCusto: 1250,
    estoque: 42,
    estoqueMinimo: 10,
    ativo: true,
    destaque: true,
  },
  {
    id: '2',
    nome: 'Petisco de Frango Desidratado 100g',
    sku: 'PET-012',
    categoria: 'Petiscos',
    marca: 'Z&K Original',
    precoVenda: 1490,
    precoCusto: 620,
    estoque: 7,
    estoqueMinimo: 15,
    ativo: true,
    destaque: false,
  },
  {
    id: '3',
    nome: 'Corda de Algodão Natural P',
    sku: 'BRI-003',
    categoria: 'Brinquedos',
    marca: 'NaturaPet',
    precoVenda: 1990,
    precoCusto: 890,
    estoque: 23,
    estoqueMinimo: 5,
    ativo: true,
    destaque: false,
  },
  {
    id: '4',
    nome: 'Mordedor Raiz de Café M',
    sku: 'MOR-007',
    categoria: 'Mordedores',
    marca: 'Z&K Original',
    precoVenda: 3490,
    precoCusto: 1800,
    estoque: 0,
    estoqueMinimo: 5,
    ativo: false,
    destaque: false,
  },
  {
    id: '5',
    nome: 'Kit Petiscos Seleção 200g',
    sku: 'KIT-001',
    categoria: 'Kits',
    marca: 'Z&K Original',
    precoVenda: 4990,
    precoCusto: 3200,
    estoque: 18,
    estoqueMinimo: 3,
    ativo: true,
    destaque: true,
  },
  {
    id: '6',
    nome: 'Shampoo Natural Aveia 250ml',
    sku: 'HIG-005',
    categoria: 'Higiene',
    marca: 'PetNature',
    precoVenda: 2290,
    precoCusto: 2500,
    estoque: 31,
    estoqueMinimo: 8,
    ativo: true,
    destaque: false,
  },
  {
    id: '7',
    nome: 'Osso Defumado 150g',
    sku: 'MOR-015',
    categoria: 'Mordedores',
    marca: 'NaturaPet',
    precoVenda: 890,
    precoCusto: 380,
    estoque: 4,
    estoqueMinimo: 10,
    ativo: true,
    destaque: false,
  },
  {
    id: '8',
    nome: 'Jerky de Batata-Doce 80g',
    sku: 'PET-023',
    categoria: 'Petiscos',
    marca: 'Z&K Original',
    precoVenda: 1190,
    precoCusto: 510,
    estoque: 55,
    estoqueMinimo: 10,
    ativo: true,
    destaque: false,
  },
]

export const CATEGORIAS = [...new Set(PRODUTOS_MOCK.map((p) => p.categoria))].sort()
export const MARCAS = [...new Set(PRODUTOS_MOCK.map((p) => p.marca))].sort()
