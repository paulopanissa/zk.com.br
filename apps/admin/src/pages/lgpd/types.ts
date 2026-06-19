export type LgpdStatus = 'PENDENTE' | 'EM_PROCESSAMENTO' | 'CONCLUIDA' | 'REJEITADA'
export type LgpdTipo = 'EXPORTACAO' | 'EXCLUSAO' | 'RETIFICACAO' | 'REVOGACAO_CONSENTIMENTO'

export interface LgpdRequest {
  id: string
  unidade_id: string
  customer_id: string
  tipo: LgpdTipo
  status: LgpdStatus
  descricao: string | null
  solicitado_em: string
  prazo_legal: string
  processado_em: string | null
  processado_por: string | null
  justificativa: string | null
  dados_exportados: Record<string, unknown> | null
  prazo_vencido: boolean
  created_at: string
  updated_at: string
}

export interface LgpdListResponse {
  data: LgpdRequest[]
  total: number
  page: number
  limit: number
}

export const STATUS_CONFIG: Record<LgpdStatus, { label: string; className: string }> = {
  PENDENTE:          { label: 'Pendente',          className: 'border-warning/40 bg-warning/10 text-warning' },
  EM_PROCESSAMENTO:  { label: 'Em processamento',  className: 'border-primary/40 bg-primary/10 text-primary' },
  CONCLUIDA:         { label: 'Concluída',          className: 'border-success/40 bg-success/10 text-success' },
  REJEITADA:         { label: 'Rejeitada',          className: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

export const TIPO_CONFIG: Record<LgpdTipo, { label: string; short: string; className: string }> = {
  EXPORTACAO:              { label: 'Exportação de dados',       short: 'Exportação',        className: 'border-primary/40 bg-primary/10 text-primary' },
  EXCLUSAO:                { label: 'Exclusão de dados',         short: 'Exclusão',           className: 'border-destructive/40 bg-destructive/10 text-destructive' },
  RETIFICACAO:             { label: 'Retificação de dados',      short: 'Retificação',        className: 'border-brand-ochre/40 bg-brand-ochre/10 text-brand-ochre' },
  REVOGACAO_CONSENTIMENTO: { label: 'Revogação de consentimento', short: 'Rev. Consentimento', className: 'border-muted-foreground/40 bg-muted text-muted-foreground' },
}

export function diasRestantes(prazoLegal: string): number {
  const prazo = new Date(prazoLegal)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  prazo.setHours(0, 0, 0, 0)
  return Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

export function canProcess(req: LgpdRequest): boolean {
  return req.status === 'PENDENTE' || req.status === 'EM_PROCESSAMENTO'
}
