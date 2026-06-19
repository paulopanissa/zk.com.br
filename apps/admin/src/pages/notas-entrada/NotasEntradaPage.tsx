import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Plus, Upload, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type NfStatus = 'RASCUNHO' | 'CONFIRMADA' | 'CANCELADA'

interface NfEntrada {
  id: string
  numero: string
  serie: string | null
  chave_acesso: string | null
  data_emissao: string
  data_entrada: string | null
  valor_total: number
  status: NfStatus
  xml_url: string | null
  pdf_url: string | null
  observacao: string | null
  fornecedor_id: string | null
  fornecedor: { id: string; razao_social: string; cnpj_cpf: string } | null
}

interface NfEntradaPage {
  data: NfEntrada[]
  total: number
  page: number
  limit: number
}

interface Supplier {
  id: string
  razao_social: string
  cnpj_cpf: string
}

interface CreateForm {
  fornecedor_id: string
  numero: string
  serie: string
  chave_acesso: string
  data_emissao: string
  data_entrada: string
  valor_total: string
  observacao: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function statusLabel(status: NfStatus): string {
  switch (status) {
    case 'RASCUNHO': return 'Rascunho'
    case 'CONFIRMADA': return 'Confirmada'
    case 'CANCELADA': return 'Cancelada'
  }
}

function statusBadgeClass(status: NfStatus): string {
  switch (status) {
    case 'RASCUNHO':
      return 'border-brand-orange/50 bg-brand-orange/20 text-brand-brown'
    case 'CONFIRMADA':
      return 'border-brand-sage/50 bg-brand-sage/20 text-brand-brown'
    case 'CANCELADA':
      return 'border-border text-muted-foreground'
  }
}

function buildCreateForm(): CreateForm {
  return {
    fornecedor_id: '',
    numero: '',
    serie: '',
    chave_acesso: '',
    data_emissao: '',
    data_entrada: '',
    valor_total: '',
    observacao: '',
  }
}

const LIMIT = 20

// ─── Component ────────────────────────────────────────────────────────────────

export function NotasEntradaPage() {
  const navigate = useNavigate()
  const xmlInputRef = useRef<HTMLInputElement>(null)

  const [nfs, setNfs] = useState<NfEntrada[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDataInicio, setFilterDataInicio] = useState('')
  const [filterDataFim, setFilterDataFim] = useState('')

  // Create sheet
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(buildCreateForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // XML upload
  const [uploading, setUploading] = useState(false)

  const load = useCallback(
    (p = page) => {
      setLoading(true)
      setError(null)
      const params: Record<string, unknown> = { page: p, limit: LIMIT }
      if (filterStatus) params.status = filterStatus
      if (filterDataInicio) params.data_inicio = filterDataInicio
      if (filterDataFim) params.data_fim = filterDataFim
      api
        .get<NfEntradaPage>('/nf-entrada', { params })
        .then((r) => {
          setNfs(r.data.data)
          setTotal(r.data.total)
        })
        .catch(() => setError('Não foi possível carregar as notas de entrada.'))
        .finally(() => setLoading(false))
    },
    [page, filterStatus, filterDataInicio, filterDataFim],
  )

  useEffect(() => {
    load()
  }, [load])

  function loadSuppliers() {
    api
      .get<{ data: Supplier[] }>('/suppliers', { params: { limit: 200 } })
      .then((r) => setSuppliers(r.data.data))
      .catch(() => {/* non-critical */})
  }

  function handleFilterChange() {
    setPage(1)
    load(1)
  }

  function openCreate() {
    setForm(buildCreateForm())
    setFormError(null)
    loadSuppliers()
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!form.numero.trim()) {
      setFormError('Número da NF é obrigatório.')
      return
    }
    if (!form.data_emissao) {
      setFormError('Data de emissão é obrigatória.')
      return
    }
    setSaving(true)
    setFormError(null)

    const valorCentavos = form.valor_total
      ? Math.round(parseFloat(form.valor_total.replace(',', '.')) * 100)
      : 0

    const body: Record<string, unknown> = {
      numero: form.numero.trim(),
      data_emissao: form.data_emissao,
    }
    if (form.serie.trim()) body.serie = form.serie.trim()
    if (form.chave_acesso.trim()) body.chave_acesso = form.chave_acesso.trim()
    if (form.data_entrada) body.data_entrada = form.data_entrada
    if (valorCentavos) body.valor_total = valorCentavos
    if (form.observacao.trim()) body.observacao = form.observacao.trim()
    if (form.fornecedor_id) body.fornecedor_id = form.fornecedor_id

    try {
      const { data } = await api.post<NfEntrada>('/nf-entrada', body)
      setCreateOpen(false)
      navigate(`/notas-entrada/${data.id}`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setFormError(typeof text === 'string' ? text : 'Erro ao criar NF. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function handleXmlClick() {
    xmlInputRef.current?.click()
  }

  async function handleXmlFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be re-selected
    e.target.value = ''
    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('xml', file)
    try {
      const { data } = await api.post<NfEntrada>('/nf-entrada/from-xml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate(`/notas-entrada/${data.id}`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setError(typeof text === 'string' ? text : 'Erro ao processar XML. Verifique o arquivo e tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  async function handleCancel(nf: NfEntrada) {
    if (!confirm(`Cancelar a NF ${nf.numero}${nf.serie ? `-${nf.serie}` : ''}?`)) return
    try {
      await api.post(`/nf-entrada/${nf.id}/cancel`)
      load(page)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      alert(typeof text === 'string' ? text : 'Erro ao cancelar NF.')
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Notas de Entrada</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} nota{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={xmlInputRef}
            type="file"
            accept=".xml"
            className="hidden"
            onChange={handleXmlFile}
          />
          <Button variant="outline" className="gap-2" onClick={handleXmlClick} disabled={uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Importando…' : 'Upload XML'}
          </Button>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova NF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          onBlur={handleFilterChange}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="CONFIRMADA">Confirmada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Data início</label>
          <Input
            type="date"
            value={filterDataInicio}
            onChange={(e) => { setFilterDataInicio(e.target.value); setPage(1) }}
            onBlur={handleFilterChange}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Data fim</label>
          <Input
            type="date"
            value={filterDataFim}
            onChange={(e) => { setFilterDataFim(e.target.value); setPage(1) }}
            onBlur={handleFilterChange}
            className="w-40"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Carregando…
        </div>
      ) : nfs.length === 0 ? (
        <EmptyState onNew={openCreate} onXml={handleXmlClick} />
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                  NF / Série
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong hidden md:table-cell">
                  Fornecedor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                  Emissão
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-strong">
                  Valor Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-strong">
                  Status
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {nfs.map((nf, i) => (
                <tr
                  key={nf.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-surface-alt/60',
                    i % 2 === 1 && 'bg-surface-alt/30',
                  )}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground font-mono">
                      {nf.numero}
                      {nf.serie ? <span className="text-muted-foreground">-{nf.serie}</span> : null}
                    </p>
                    {nf.chave_acesso && (
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]" title={nf.chave_acesso}>
                        {nf.chave_acesso.slice(0, 20)}…
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {nf.fornecedor ? (
                      <div>
                        <p className="text-foreground">{nf.fornecedor.razao_social}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {nf.fornecedor.cnpj_cpf}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(nf.data_emissao)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                    {formatCurrency(nf.valor_total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', statusBadgeClass(nf.status))}
                    >
                      {statusLabel(nf.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Ver detalhes"
                        onClick={() => navigate(`/notas-entrada/${nf.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {nf.status === 'RASCUNHO' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Cancelar NF"
                          onClick={() => handleCancel(nf)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {total} nota{total !== 1 ? 's' : ''}
              {totalPages > 1 && ` · página ${page} de ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create NF Sheet */}
      <Sheet open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nova Nota de Entrada</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-5">
            {/* Fornecedor */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Fornecedor</label>
              <select
                value={form.fornecedor_id}
                onChange={(e) => setForm((p) => ({ ...p, fornecedor_id: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecione um fornecedor…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.razao_social}
                  </option>
                ))}
              </select>
            </div>

            {/* Número + Série */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Número *</label>
                <Input
                  value={form.numero}
                  onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                  placeholder="000001"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Série</label>
                <Input
                  value={form.serie}
                  onChange={(e) => setForm((p) => ({ ...p, serie: e.target.value }))}
                  placeholder="1"
                />
              </div>
            </div>

            {/* Chave de Acesso */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Chave de Acesso</label>
              <Input
                value={form.chave_acesso}
                onChange={(e) => setForm((p) => ({ ...p, chave_acesso: e.target.value }))}
                placeholder="44 dígitos"
                maxLength={44}
                className="font-mono text-xs"
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Data Emissão *</label>
                <Input
                  type="date"
                  value={form.data_emissao}
                  onChange={(e) => setForm((p) => ({ ...p, data_emissao: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Data Entrada</label>
                <Input
                  type="date"
                  value={form.data_entrada}
                  onChange={(e) => setForm((p) => ({ ...p, data_entrada: e.target.value }))}
                />
              </div>
            </div>

            {/* Valor Total */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Valor Total (R$)</label>
              <Input
                value={form.valor_total}
                onChange={(e) => setForm((p) => ({ ...p, valor_total: e.target.value }))}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>

            {/* Observação */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Observação</label>
              <textarea
                value={form.observacao}
                onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                placeholder="Observações internas sobre esta nota"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            {formError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Criando…' : 'Criar e adicionar itens'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew, onXml }: { onNew: () => void; onXml: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-5xl mb-4">🧾</p>
        <p className="font-display text-lg font-bold text-foreground">Nenhuma nota de entrada</p>
        <p className="text-sm text-muted-foreground mt-1">
          Importe um XML de NF-e ou crie uma nota manualmente.
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Button variant="outline" className="gap-2" onClick={onXml}>
            <Upload className="h-4 w-4" />
            Upload XML
          </Button>
          <Button className="gap-2" onClick={onNew}>
            <Plus className="h-4 w-4" />
            Nova NF
          </Button>
        </div>
      </div>
    </div>
  )
}
