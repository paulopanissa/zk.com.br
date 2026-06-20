export interface ProdutoPDV {
  id: string
  nome: string
  sku: string
  precoCentavos: number
  estoqueDisponivel: number
  categoria: string
  ativo: boolean
  imagemUrl?: string
  videoUrl?: string
}

export interface CategoriaMeta {
  emoji: string
  label: string
  bg: string
  text: string
}

export const CATEGORIA_META: Record<string, CategoriaMeta> = {
  Todos: { emoji: '🐾', label: 'Todos', bg: 'bg-amber-50', text: 'text-amber-700' },
  Ração: { emoji: '🥘', label: 'Ração', bg: 'bg-orange-50', text: 'text-orange-700' },
  Petisco: { emoji: '🦴', label: 'Petisco', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  Medicamento: { emoji: '💊', label: 'Medicamento', bg: 'bg-red-50', text: 'text-red-700' },
  Acessório: { emoji: '🎀', label: 'Acessório', bg: 'bg-purple-50', text: 'text-purple-700' },
  Higiene: { emoji: '🧼', label: 'Higiene', bg: 'bg-blue-50', text: 'text-blue-700' },
  Brinquedo: { emoji: '🎾', label: 'Brinquedo', bg: 'bg-green-50', text: 'text-green-700' },
}

export const PRODUTOS_PDV: ProdutoPDV[] = [
  {
    id: 'p1',
    nome: 'Ração Golden Adulto 15kg',
    sku: 'RAC-GLD-15',
    precoCentavos: 12900,
    estoqueDisponivel: 87,
    categoria: 'Ração',
    ativo: true,
    // vídeo demonstrativo de produto (demo — substituir por URL real)
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'p2',
    nome: 'Ração Hills Filhote 3kg',
    sku: 'RAC-HLS-3',
    precoCentavos: 8900,
    estoqueDisponivel: 42,
    categoria: 'Ração',
    ativo: true,
  },
  {
    id: 'p3',
    nome: 'Ração Royal Canin Gato 7.5kg',
    sku: 'RAC-RCG-75',
    precoCentavos: 14900,
    estoqueDisponivel: 0,
    categoria: 'Ração',
    ativo: true,
  },
  {
    id: 'p4',
    nome: 'Petisco Bifinho 500g',
    sku: 'TRT-BFN-500',
    precoCentavos: 2200,
    estoqueDisponivel: 67,
    categoria: 'Petisco',
    ativo: true,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: 'p5',
    nome: 'Antipulgas Frontline Plus Cães',
    sku: 'MED-FRL-C',
    precoCentavos: 8200,
    estoqueDisponivel: 18,
    categoria: 'Medicamento',
    ativo: true,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
  {
    id: 'p6',
    nome: 'Coleira Anti-Pulgas 8 meses',
    sku: 'ACE-CPL-8',
    precoCentavos: 4800,
    estoqueDisponivel: 2,
    categoria: 'Acessório',
    ativo: true,
  },
  {
    id: 'p7',
    nome: 'Shampoo Pet Clean 500ml',
    sku: 'HIG-SPC-500',
    precoCentavos: 4100,
    estoqueDisponivel: 71,
    categoria: 'Higiene',
    ativo: true,
  },
  {
    id: 'p8',
    nome: 'Areia Sanitária Premium 4kg',
    sku: 'ACE-ARN-4',
    precoCentavos: 5500,
    estoqueDisponivel: 156,
    categoria: 'Higiene',
    ativo: true,
  },
  {
    id: 'p9',
    nome: 'Brinquedo Mordedor Borracha',
    sku: 'BRQ-MRD-01',
    precoCentavos: 1990,
    estoqueDisponivel: 4,
    categoria: 'Brinquedo',
    ativo: true,
  },
  {
    id: 'p10',
    nome: 'Bebedouro Automático 1.5L',
    sku: 'ACE-BDA-15',
    precoCentavos: 12900,
    estoqueDisponivel: 19,
    categoria: 'Acessório',
    ativo: true,
  },
  {
    id: 'p11',
    nome: 'Ração Golden Filhote 3kg',
    sku: 'RAC-GLD-3F',
    precoCentavos: 7200,
    estoqueDisponivel: 34,
    categoria: 'Ração',
    ativo: true,
  },
  {
    id: 'p12',
    nome: 'Vermífugo Endal Plus',
    sku: 'MED-END-P',
    precoCentavos: 3600,
    estoqueDisponivel: 22,
    categoria: 'Medicamento',
    ativo: true,
  },
  {
    id: 'p13',
    nome: 'Tapete Higiênico 30un',
    sku: 'HIG-TAP-30',
    precoCentavos: 4900,
    estoqueDisponivel: 48,
    categoria: 'Higiene',
    ativo: true,
  },
  {
    id: 'p14',
    nome: 'Caixa de Transporte Média',
    sku: 'ACE-CTM-01',
    precoCentavos: 13500,
    estoqueDisponivel: 8,
    categoria: 'Acessório',
    ativo: true,
  },
  {
    id: 'p15',
    nome: 'Snack Dental Ossinho',
    sku: 'TRT-DNS-OT',
    precoCentavos: 1800,
    estoqueDisponivel: 90,
    categoria: 'Petisco',
    ativo: true,
  },
]

export const formatBRL = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
