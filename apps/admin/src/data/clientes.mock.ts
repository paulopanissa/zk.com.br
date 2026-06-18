export interface ClienteMock {
  id: string
  nome: string
  email: string
  cpfCnpjMascarado: string
  telefonePrincipal: string
  cidade: string
  uf: string
  dataCadastro: string
  totalGastoCentavos: number
  totalPedidos: number
  ativo: boolean
  consentimentoLgpd: boolean
}

export interface PedidoClienteMock {
  id: string
  numero: string
  status: 'ABERTA' | 'FINALIZADA' | 'CANCELADA'
  origem: 'PDV' | 'ECOMMERCE' | 'WHATSAPP'
  totalLiquidoCentavos: number
  descontoTotalCentavos: number
  criadoEm: string
  finalizadaEm: string | null
}

export interface ClienteDetalheMock extends ClienteMock {
  dataNascimento: string
  enderecos: {
    id: string
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    principal: boolean
  }[]
  pedidos: PedidoClienteMock[]
}

export const CLIENTES_MOCK: ClienteMock[] = [
  {
    id: '1',
    nome: 'Ana Paula Ferreira',
    email: 'anapaula@email.com',
    cpfCnpjMascarado: '***.*23.456-**',
    telefonePrincipal: '(11) 99123-4567',
    cidade: 'São Paulo',
    uf: 'SP',
    dataCadastro: '2025-03-15',
    totalGastoCentavos: 128950,
    totalPedidos: 7,
    ativo: true,
    consentimentoLgpd: true,
  },
  {
    id: '2',
    nome: 'Bruno Carvalho',
    email: 'brunocarv@email.com',
    cpfCnpjMascarado: '***.*78.901-**',
    telefonePrincipal: '(11) 98765-4321',
    cidade: 'São Paulo',
    uf: 'SP',
    dataCadastro: '2025-05-22',
    totalGastoCentavos: 45200,
    totalPedidos: 3,
    ativo: true,
    consentimentoLgpd: true,
  },
  {
    id: '3',
    nome: 'Carla Mendes',
    email: 'carlam@email.com',
    cpfCnpjMascarado: '***.*34.567-**',
    telefonePrincipal: '(19) 97654-3210',
    cidade: 'Campinas',
    uf: 'SP',
    dataCadastro: '2025-07-10',
    totalGastoCentavos: 82300,
    totalPedidos: 5,
    ativo: true,
    consentimentoLgpd: true,
  },
  {
    id: '4',
    nome: 'Diego Souza',
    email: 'diegosouza@email.com',
    cpfCnpjMascarado: '***.*90.123-**',
    telefonePrincipal: '(21) 96543-2109',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    dataCadastro: '2025-08-01',
    totalGastoCentavos: 18700,
    totalPedidos: 1,
    ativo: false,
    consentimentoLgpd: false,
  },
  {
    id: '5',
    nome: 'Elena Ribeiro',
    email: 'elena.r@email.com',
    cpfCnpjMascarado: '***.*56.789-**',
    telefonePrincipal: '(11) 95432-1098',
    cidade: 'São Paulo',
    uf: 'SP',
    dataCadastro: '2025-09-14',
    totalGastoCentavos: 234000,
    totalPedidos: 12,
    ativo: true,
    consentimentoLgpd: true,
  },
  {
    id: '6',
    nome: 'Felipe Gomes',
    email: 'felipeg@email.com',
    cpfCnpjMascarado: '***.*12.345-**',
    telefonePrincipal: '(31) 94321-0987',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    dataCadastro: '2025-10-03',
    totalGastoCentavos: 55600,
    totalPedidos: 4,
    ativo: true,
    consentimentoLgpd: true,
  },
  {
    id: '7',
    nome: 'Gabriela Nunes',
    email: 'gabinunes@email.com',
    cpfCnpjMascarado: '***.*68.901-**',
    telefonePrincipal: '(11) 93210-9876',
    cidade: 'São Paulo',
    uf: 'SP',
    dataCadastro: '2025-11-20',
    totalGastoCentavos: 9800,
    totalPedidos: 2,
    ativo: true,
    consentimentoLgpd: true,
  },
  {
    id: '8',
    nome: 'Henrique Lima',
    email: 'henriquel@email.com',
    cpfCnpjMascarado: '***.*24.567-**',
    telefonePrincipal: '(41) 92109-8765',
    cidade: 'Curitiba',
    uf: 'PR',
    dataCadastro: '2025-12-05',
    totalGastoCentavos: 71200,
    totalPedidos: 6,
    ativo: true,
    consentimentoLgpd: true,
  },
  {
    id: '9',
    nome: 'Isabela Costa',
    email: 'isabela.c@email.com',
    cpfCnpjMascarado: '***.*80.123-**',
    telefonePrincipal: '(11) 91098-7654',
    cidade: 'São Paulo',
    uf: 'SP',
    dataCadastro: '2026-01-08',
    totalGastoCentavos: 142500,
    totalPedidos: 9,
    ativo: true,
    consentimentoLgpd: true,
  },
  {
    id: '10',
    nome: 'João Paulo Alves',
    email: 'joaopa@email.com',
    cpfCnpjMascarado: '***.*36.789-**',
    telefonePrincipal: '(48) 90987-6543',
    cidade: 'Florianópolis',
    uf: 'SC',
    dataCadastro: '2026-02-14',
    totalGastoCentavos: 33400,
    totalPedidos: 2,
    ativo: true,
    consentimentoLgpd: true,
  },
  {
    id: '11',
    nome: 'Karen Martins',
    email: 'karenmartins@email.com',
    cpfCnpjMascarado: '***.*92.345-**',
    telefonePrincipal: '(11) 99876-5432',
    cidade: 'São Paulo',
    uf: 'SP',
    dataCadastro: '2026-03-01',
    totalGastoCentavos: 0,
    totalPedidos: 0,
    ativo: false,
    consentimentoLgpd: true,
  },
  {
    id: '12',
    nome: 'Lucas Pereira',
    email: 'lucasper@email.com',
    cpfCnpjMascarado: '***.*48.901-**',
    telefonePrincipal: '(11) 98765-1234',
    cidade: 'São Paulo',
    uf: 'SP',
    dataCadastro: '2026-04-22',
    totalGastoCentavos: 189000,
    totalPedidos: 14,
    ativo: true,
    consentimentoLgpd: true,
  },
]

export const CLIENTE_DETALHE_MOCK: Record<string, ClienteDetalheMock> = {
  '1': {
    ...CLIENTES_MOCK[0],
    dataNascimento: '1990-07-15',
    enderecos: [
      {
        id: 'e1',
        logradouro: 'Rua das Rosas',
        numero: '123',
        complemento: 'Apto 42',
        bairro: 'Jardim Paulista',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01452-000',
        principal: true,
      },
    ],
    pedidos: [
      { id: 'p1', numero: '0042', status: 'FINALIZADA', origem: 'PDV', totalLiquidoCentavos: 29750, descontoTotalCentavos: 0, criadoEm: '2026-06-10T14:30:00', finalizadaEm: '2026-06-10T14:32:00' },
      { id: 'p2', numero: '0038', status: 'FINALIZADA', origem: 'PDV', totalLiquidoCentavos: 18500, descontoTotalCentavos: 1000, criadoEm: '2026-05-28T11:15:00', finalizadaEm: '2026-05-28T11:17:00' },
      { id: 'p3', numero: '0031', status: 'CANCELADA', origem: 'ECOMMERCE', totalLiquidoCentavos: 9900, descontoTotalCentavos: 0, criadoEm: '2026-05-01T09:00:00', finalizadaEm: null },
      { id: 'p4', numero: '0027', status: 'FINALIZADA', origem: 'PDV', totalLiquidoCentavos: 45200, descontoTotalCentavos: 2000, criadoEm: '2026-04-15T16:45:00', finalizadaEm: '2026-04-15T16:50:00' },
      { id: 'p5', numero: '0019', status: 'FINALIZADA', origem: 'PDV', totalLiquidoCentavos: 8800, descontoTotalCentavos: 0, criadoEm: '2026-03-22T10:00:00', finalizadaEm: '2026-03-22T10:01:00' },
      { id: 'p6', numero: '0014', status: 'FINALIZADA', origem: 'ECOMMERCE', totalLiquidoCentavos: 12300, descontoTotalCentavos: 500, criadoEm: '2026-02-10T20:00:00', finalizadaEm: '2026-02-11T09:00:00' },
      { id: 'p7', numero: '0008', status: 'FINALIZADA', origem: 'PDV', totalLiquidoCentavos: 4400, descontoTotalCentavos: 0, criadoEm: '2026-01-05T15:00:00', finalizadaEm: '2026-01-05T15:02:00' },
    ],
  },
}
