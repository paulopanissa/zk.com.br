import { useEffect, useRef, useState } from 'react'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertTriangle, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  type LgpdRequest,
  STATUS_CONFIG,
  TIPO_CONFIG,
  diasRestantes,
  canProcess,
} from '../types'

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  )
}

interface LgpdDetailSheetProps {
  open: boolean
  onClose: () => void
  requestId: string | null
  onProcessed: () => void
}

export function LgpdDetailSheet({ open, onClose, requestId, onProcessed }: LgpdDetailSheetProps) {
  const [req, setReq] = useState<LgpdRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const [processStatus, setProcessStatus] = useState<'CONCLUIDA' | 'REJEITADA' | ''>('')
  const [justificativa, setJustificativa] = useState('')
  const [processError, setProcessError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const processingRef = useRef(false)

  useEffect(() => {
    if (!open || !requestId) return
    setReq(null)
    setFetchError(false)
    setLoading(true)
    setProcessStatus('')
    setJustificativa('')
    setProcessError(null)

    const controller = new AbortController()
    api.get<LgpdRequest>(`/lgpd/requests/${requestId}`, { signal: controller.signal })
      .then((r) => setReq(r.data))
      .catch((err: unknown) => {
        if (!(err instanceof Error && err.name === 'CanceledError')) setFetchError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [open, requestId])

  async function handleProcess(e: React.FormEvent) {
    e.preventDefault()
    if (!req || !processStatus || processingRef.current) return
    if (processStatus === 'REJEITADA' && !justificativa.trim()) {
      setProcessError('Justificativa obrigatória ao rejeitar.')
      return
    }
    processingRef.current = true
    setProcessing(true)
    setProcessError(null)
    try {
      const payload: Record<string, unknown> = { status: processStatus }
      if (justificativa.trim()) payload.justificativa = justificativa.trim()
      await api.patch(`/lgpd/requests/${req.id}/process`, payload)
      onProcessed()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      setProcessError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Não foi possível processar. Tente novamente.'))
    } finally {
      processingRef.current = false
      setProcessing(false)
    }
  }

  const dias = req ? diasRestantes(req.prazo_legal) : 0

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Solicitação LGPD</SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {fetchError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Não foi possível carregar os detalhes. Feche e tente novamente.
            </div>
          )}

          {req && !loading && (
            <>
              {/* Status + Tipo */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn('text-xs font-medium', STATUS_CONFIG[req.status].className)}>
                  {STATUS_CONFIG[req.status].label}
                </Badge>
                <Badge variant="outline" className={cn('text-xs font-medium', TIPO_CONFIG[req.tipo].className)}>
                  {TIPO_CONFIG[req.tipo].label}
                </Badge>
                {req.prazo_vencido && (
                  <Badge variant="outline" className="text-xs border-destructive/40 bg-destructive/10 text-destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Prazo vencido
                  </Badge>
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="ID da solicitação">
                  <span className="font-mono text-xs">{req.id}</span>
                </InfoRow>
                <InfoRow label="Titular (customer ID)">
                  <span className="font-mono text-xs">{req.customer_id}</span>
                </InfoRow>
                <InfoRow label="Solicitado em">
                  {formatDateTime(req.solicitado_em)}
                </InfoRow>
                <InfoRow label="Prazo legal">
                  <span className={cn(
                    'font-medium',
                    req.prazo_vencido ? 'text-destructive' : dias <= 7 ? 'text-warning' : 'text-success',
                  )}>
                    {req.prazo_vencido ? 'Vencido' : `${dias} dia${dias !== 1 ? 's' : ''}`}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({new Date(req.prazo_legal).toLocaleDateString('pt-BR')})
                    </span>
                  </span>
                </InfoRow>
                {req.processado_em && (
                  <InfoRow label="Processado em">{formatDateTime(req.processado_em)}</InfoRow>
                )}
                {req.processado_por && (
                  <InfoRow label="Processado por">
                    <span className="font-mono text-xs">{req.processado_por}</span>
                  </InfoRow>
                )}
              </div>

              {req.descricao && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Descrição</span>
                  <p className="text-sm text-foreground leading-relaxed rounded-lg bg-muted/30 px-3 py-2">
                    {req.descricao}
                  </p>
                </div>
              )}

              {req.justificativa && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Justificativa da decisão</span>
                  <p className="text-sm text-foreground leading-relaxed rounded-lg bg-muted/30 px-3 py-2">
                    {req.justificativa}
                  </p>
                </div>
              )}

              {/* Dados exportados */}
              {req.tipo === 'EXPORTACAO' && req.status === 'CONCLUIDA' && req.dados_exportados && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-warning" />
                    <span className="text-xs font-medium text-warning">Dados pessoais sensíveis — acesso restrito</span>
                  </div>
                  <pre className="rounded-lg border border-border bg-muted/40 p-3 text-xs overflow-x-auto max-h-60 leading-relaxed text-foreground">
                    {JSON.stringify(req.dados_exportados, null, 2)}
                  </pre>
                </div>
              )}

              {/* Formulário de processamento */}
              {canProcess(req) && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Processar solicitação</h3>

                  <form id="process-form" onSubmit={handleProcess} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Decisão *</label>
                      <Select
                        value={processStatus}
                        onValueChange={(v) => {
                          setProcessStatus(v as 'CONCLUIDA' | 'REJEITADA')
                          setProcessError(null)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a decisão" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CONCLUIDA">Concluir</SelectItem>
                          <SelectItem value="REJEITADA">Rejeitar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Justificativa{processStatus === 'REJEITADA' ? ' *' : ''}
                      </label>
                      <textarea
                        placeholder={
                          processStatus === 'REJEITADA'
                            ? 'Motivo da rejeição (obrigatório)'
                            : 'Observações sobre o processamento (opcional)'
                        }
                        maxLength={2000}
                        rows={3}
                        value={justificativa}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          setJustificativa(e.target.value)
                          setProcessError(null)
                        }}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-right">{justificativa.length}/2000</p>
                    </div>

                    {processError && (
                      <p className="text-sm text-destructive">{processError}</p>
                    )}

                    <Button
                      type="submit"
                      form="process-form"
                      disabled={processing || !processStatus}
                      className={cn(
                        'w-full',
                        processStatus === 'REJEITADA' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
                      )}
                    >
                      {processing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando…</>
                      ) : processStatus === 'CONCLUIDA' ? (
                        'Concluir solicitação'
                      ) : processStatus === 'REJEITADA' ? (
                        'Rejeitar solicitação'
                      ) : (
                        'Processar solicitação'
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
