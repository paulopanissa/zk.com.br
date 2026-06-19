import { useCallback, useEffect, useState } from 'react'
import {
  Plus,
  MoreHorizontal,
  PowerOff,
  Power,
  Pencil,
  Trash2,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { AiKeyModal } from './components/AiKeyModal'
import { type AiKey, type AiProvider, PROVIDER_CONFIG } from './types'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function TestStatus({ k, testing }: { k: AiKey; testing: boolean }) {
  if (testing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Testando…</span>
      </div>
    )
  }
  if (k.last_tested_at === null) {
    return <span className="text-xs text-muted-foreground">Nunca testado</span>
  }
  if (k.last_test_ok) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{k.last_test_latency_ms}ms</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{formatDate(k.last_tested_at)}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-xs text-destructive">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Inválida</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{formatDate(k.last_tested_at)}</span>
    </div>
  )
}

export function AiKeysPage() {
  const [keys, setKeys] = useState<AiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [providerFilter, setProviderFilter] = useState<AiProvider | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editKey, setEditKey] = useState<AiKey | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params: Record<string, string> = {}
      if (providerFilter !== 'all') params.provider = providerFilter
      const r = await api.get<AiKey[]>('/ai-keys', { params })
      setKeys(r.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [providerFilter])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  async function handleToggle(k: AiKey) {
    if (togglingId) return
    setTogglingId(k.id)
    setKeys((prev) => prev.map((item) => item.id === k.id ? { ...item, active: !k.active } : item))
    try {
      await api.patch(`/ai-keys/${k.id}`, { active: !k.active })
    } catch {
      setKeys((prev) => prev.map((item) => item.id === k.id ? { ...item, active: k.active } : item))
    } finally {
      setTogglingId(null)
    }
  }

  async function handleTest(id: string) {
    if (testingId) return
    setTestingId(id)
    try {
      await api.post(`/ai-keys/${id}/test`)
      await loadKeys()
    } catch {
      await loadKeys()
    } finally {
      setTestingId(null)
    }
  }

  async function handleDeleteConfirm(id: string) {
    if (deletingId) return
    setDeleteConfirmId(null)
    setDeletingId(id)
    try {
      await api.delete(`/ai-keys/${id}`)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch {
      await loadKeys()
    } finally {
      setDeletingId(null)
    }
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditKey(null)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">API Keys de IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {keys.length} chave{keys.length !== 1 ? 's' : ''} cadastrada{keys.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nova chave
        </Button>
      </div>

      {/* Filtro por provider */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Select
            value={providerFilter}
            disabled={!!testingId}
            onValueChange={(v) => { setProviderFilter(v as AiProvider | 'all'); setDeleteConfirmId(null) }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por provedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os provedores</SelectItem>
              {(Object.keys(PROVIDER_CONFIG) as AiProvider[]).map((p) => (
                <SelectItem key={p} value={p}>{PROVIDER_CONFIG[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar as chaves.{' '}
          <button className="underline font-medium" onClick={loadKeys}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && keys.length === 0 ? (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {[100, 160, 120, 60, 100, 32].map((w, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-muted/60 rounded animate-pulse" style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : keys.length === 0 && !loading ? (
        <div className="rounded-lg border border-border bg-card shadow-sm py-20 text-center">
          <Zap className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-display text-lg font-bold text-foreground">Nenhuma chave cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione uma chave de API para habilitar funcionalidades de IA
          </p>
          <Button
            className="mt-4 gap-2"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nova chave
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {[
                    { key: 'provider', label: 'Provedor' },
                    { key: 'label', label: 'Label / Chave' },
                    { key: 'status', label: 'Status' },
                    { key: 'test', label: 'Último Teste' },
                    { key: 'actions', label: '' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className={cn(
                        'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left',
                        key === 'actions' && 'w-12',
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((k, i) => {
                  const pc = PROVIDER_CONFIG[k.provider]
                  const isOdd = i % 2 === 1
                  const isDeleting = deleteConfirmId === k.id
                  const isTesting = testingId === k.id

                  return (
                    <tr
                      key={k.id}
                      className={cn(
                        'border-b border-border/50 transition-colors hover:bg-muted/20',
                        isOdd && 'bg-muted/10',
                        isDeleting && 'bg-destructive/5',
                        isTesting && 'opacity-75',
                      )}
                    >
                      {/* Provedor */}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn('text-xs font-medium', pc.badgeClass)}>
                          {pc.label}
                        </Badge>
                      </td>

                      {/* Label + Chave mascarada */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{k.label}</p>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">
                          {k.key_prefix}…{k.key_suffix}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            k.active
                              ? 'border-success/40 bg-success/10 text-success'
                              : 'border-border text-muted-foreground',
                          )}
                        >
                          {k.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>

                      {/* Último Teste */}
                      <td className="px-4 py-3">
                        <TestStatus k={k} testing={isTesting} />
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        {isDeleting ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => handleDeleteConfirm(k.id)}
                            >
                              Excluir
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                disabled={isTesting}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditKey(k); setModalOpen(true) }}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleTest(k.id)}
                                disabled={!!testingId}
                              >
                                <Zap className="mr-2 h-3.5 w-3.5" />
                                Testar conectividade
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-muted-foreground"
                                disabled={togglingId === k.id}
                                onClick={() => handleToggle(k)}
                              >
                                {k.active ? (
                                  <><PowerOff className="mr-2 h-3.5 w-3.5" />Desativar</>
                                ) : (
                                  <><Power className="mr-2 h-3.5 w-3.5" />Ativar</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteConfirmId(k.id)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AiKeyModal
        open={modalOpen}
        onClose={handleModalClose}
        aiKey={editKey}
        onSaved={loadKeys}
      />
    </div>
  )
}
