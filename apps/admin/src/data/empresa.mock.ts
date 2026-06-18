export interface Empresa {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  ie: string
  im: string
  regimeTributario: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL'
  siteUrl: string
  dpoEmail: string
  enderecoLogradouro: string
  enderecoNumero: string
  enderecoComplemento: string
  enderecoBairro: string
  enderecoCidade: string
  enderecoUF: string
  enderecoCEP: string
  telefonePrincipal: string
  emailPrincipal: string
}

export interface Unidade {
  id: string
  nome: string
  tipo: 'MATRIZ' | 'FILIAL'
  ativo: boolean
  timezone: string
  estoqueProprioEnabled: boolean
  caixaProprioEnabled: boolean
  logradouro: string
  cidade: string
  uf: string
}

export const EMPRESA_MOCK: Empresa = {
  razaoSocial: 'Zoro & Kaya Comércio de Produtos para Pets LTDA',
  nomeFantasia: 'Zoro&Kaya',
  cnpj: '12.345.678/0001-90',
  ie: '123.456.789.000',
  im: '1234567',
  regimeTributario: 'SIMPLES_NACIONAL',
  siteUrl: 'https://zorokaya.com.br',
  dpoEmail: 'privacidade@zorokaya.com.br',
  enderecoLogradouro: 'Rua dos Pets',
  enderecoNumero: '42',
  enderecoComplemento: 'Sala 1',
  enderecoBairro: 'Centro',
  enderecoCidade: 'São Paulo',
  enderecoUF: 'SP',
  enderecoCEP: '01310-100',
  telefonePrincipal: '(11) 99999-0000',
  emailPrincipal: 'contato@zorokaya.com.br',
}

export const UNIDADES_MOCK: Unidade[] = [
  {
    id: '1',
    nome: 'Zoro&Kaya — Loja Central',
    tipo: 'MATRIZ',
    ativo: true,
    timezone: 'America/Sao_Paulo',
    estoqueProprioEnabled: true,
    caixaProprioEnabled: true,
    logradouro: 'Rua dos Pets, 42',
    cidade: 'São Paulo',
    uf: 'SP',
  },
  {
    id: '2',
    nome: 'Zoro&Kaya — Unidade Pinheiros',
    tipo: 'FILIAL',
    ativo: true,
    timezone: 'America/Sao_Paulo',
    estoqueProprioEnabled: false,
    caixaProprioEnabled: true,
    logradouro: 'Al. dos Aipins, 12',
    cidade: 'São Paulo',
    uf: 'SP',
  },
  {
    id: '3',
    nome: 'Zoro&Kaya — Unidade Campinas',
    tipo: 'FILIAL',
    ativo: false,
    timezone: 'America/Sao_Paulo',
    estoqueProprioEnabled: true,
    caixaProprioEnabled: true,
    logradouro: 'Av. das Garras, 200',
    cidade: 'Campinas',
    uf: 'SP',
  },
]

// Configurações fiscais mock
export interface TaxConfig {
  ambiente: 'HOMOLOGACAO' | 'PRODUCAO'
  cfopPadraoVenda: string
  cfopPadraoTransferencia: string
  serieNFCe: number
  serieNFe: number
  proxNumeroNFCe: number
  proxNumeroNFe: number
}

export const TAX_CONFIG_MOCK: TaxConfig = {
  ambiente: 'HOMOLOGACAO',
  cfopPadraoVenda: '5102',
  cfopPadraoTransferencia: '5152',
  serieNFCe: 1,
  serieNFe: 1,
  proxNumeroNFCe: 101,
  proxNumeroNFe: 1,
}

// Configurações de pagamento mock
export interface PaymentProvider {
  id: string
  provedor: string
  canal: 'PDV' | 'ECOMMERCE' | 'AMBOS'
  metodos: string[]
  ativo: boolean
  ambiente: 'SANDBOX' | 'PRODUCAO'
}

export const PAYMENT_PROVIDERS_MOCK: PaymentProvider[] = [
  {
    id: '1',
    provedor: 'MercadoPago',
    canal: 'AMBOS',
    metodos: ['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'MAQUININHA_POINT'],
    ativo: true,
    ambiente: 'SANDBOX',
  },
  {
    id: '2',
    provedor: 'Stripe',
    canal: 'ECOMMERCE',
    metodos: ['CARTAO_CREDITO', 'CARTAO_DEBITO'],
    ativo: false,
    ambiente: 'SANDBOX',
  },
]
