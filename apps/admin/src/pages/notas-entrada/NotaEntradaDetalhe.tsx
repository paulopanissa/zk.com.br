import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Edit2,
  ExternalLink,
  FileText,
  Layers,
  Link2,
  PackagePlus,
  Paperclip,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { ProgressRoot, ProgressTrack, ProgressRange } from '@ark-ui/react'
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

interface NfEntradaItem {
  id: string
  numero_item: number
  codigo_produto: string | null
  ean: string | null
  descricao: string
  ncm: string | null
  cfop: string | null
  unidade_medida: string | null
  quantidade: number
  valor_unitario: number
  valor_total: number
  lote_numero: string | null
  data_validade: string | null
  data_fabricacao: string | null
  product_id: string | null
  brand_id: string | null
  product: { id: string; name: string } | null
  brand: { id: string; name: string } | null
}

interface NfEntradaDetalhe extends NfEntrada {
  items: NfEntradaItem[]
}

interface ProductOption {
  id: string
  name: string
}

interface BrandOption {
  id: string
  name: string
}

// ─── Item link form ───────────────────────────────────────────────────────────

interface ItemLinkForm {
  product_id: string
  brand_id: string
  lote_numero: string
  data_validade: string
  data_fabricacao: string
}

function buildItemLinkForm(item?: NfEntradaItem): ItemLinkForm {
  return {
    product_id: item?.product_id ?? '',
    brand_id: item?.brand_id ?? '',
    lote_numero: item?.lote_numero ?? '',
    data_validade: item?.data_validade ? item.data_validade.split('T')[0] : '',
    data_fabricacao: item?.data_fabricacao ? item.data_fabricacao.split('T')[0] : '',
  }
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

function extractApiError(e: unknown): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message
  const text = Array.isArray(msg) ? msg[0] : msg
  return typeof text === 'string' ? text : ''
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotaEntradaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [nf, setNf] = useState<NfEntradaDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Success banner
  const fromSource = searchParams.get('from')
  const [showBanner, setShowBanner] = useState(!!fromSource)
  const successMessage = fromSource === 'xml'
    ? 'XML importado com sucesso — revise os itens e vincule os produtos antes de confirmar.'
    : fromSource === 'manual'
    ? 'Nota criada — adicione os itens e vincule os produtos antes de confirmar.'
    : null

  // PDF attach
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [attachingPdf, setAttachingPdf] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  // Item link sheet
  const [itemSheet, setItemSheet] = useState<{ item: NfEntradaItem } | null>(null)
  const [itemForm, setItemForm] = useState<ItemLinkForm>(buildItemLinkForm())
  const [itemSaving, setItemSaving] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [noResultsFor, setNoResultsFor] = useState<string | null>(null)
  const [brands, setBrands] = useState<BrandOption[]>([])

  // Quick-create product inline
  interface QuickCreateForm { name: string; sku: string; barcode: string; unit: string }
  const [quickCreate, setQuickCreate] = useState<QuickCreateForm | null>(null)
  const [quickCreating, setQuickCreating] = useState(false)
  const [quickCreateError, setQuickCreateError] = useState<string | null>(null)

  // Bulk brand sheet
  const [bulkBrandOpen, setBulkBrandOpen] = useState(false)
  const [bulkBrandId, setBulkBrandId] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    api
      .get<NfEntradaDetalhe>(`/nf-entrada/${id}`)
      .then((r) => setNf(r.data))
      .catch(() => setError('Não foi possível carregar a nota de entrada.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id])

  // Auto-dismiss success banner
  useEffect(() => {
    if (!showBanner) return
    const t = setTimeout(() => setShowBanner(false), 6000)
    return () => clearTimeout(t)
  }, [showBanner])

  // ── Product search ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!itemSheet) return
    const q = productSearch.trim()
    const timeout = setTimeout(() => {
      const params: Record<string, unknown> = { limit: 20 }
      if (q) params.name = q
      api
        .get<{ data: ProductOption[] }>('/products', { params })
        .then((r) => {
          setProducts(r.data.data)
          setNoResultsFor(r.data.data.length === 0 && q.length > 1 ? q : null)
        })
        .catch(() => {
          setProducts([])
          setNoResultsFor(null)
        })
    }, 300)
    return () => clearTimeout(timeout)
  }, [productSearch, itemSheet])

  function loadBrands() {
    api
      .get<{ data: BrandOption[] }>('/brands', { params: { limit: 100 } })
      .then((r) => setBrands(r.data.data))
      .catch(() => {/* non-critical */})
  }

  // ── Confirm NF ─────────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!nf) return
    const unlinked = nf.items.filter((i) => !i.product_id).length
    if (unlinked > 0) {
      const proceed = confirm(
        `${unlinked} ite${unlinked !== 1 ? 'ns não possuem' : 'm não possui'} produto vinculado. Deseja confirmar mesmo assim?`,
      )
      if (!proceed) return
    }
    setConfirming(true)
    setActionError(null)
    try {
      await api.post(`/nf-entrada/${id}/confirm`)
      load()
    } catch (e) {
      const msg = extractApiError(e)
      setActionError(msg || 'Erro ao confirmar NF. Tente novamente.')
    } finally {
      setConfirming(false)
    }
  }

  // ── Cancel NF ──────────────────────────────────────────────────────────────

  async function handleCancel() {
    if (!nf) return
    if (!confirm(`Cancelar a NF ${nf.numero}${nf.serie ? `-${nf.serie}` : ''}? Esta ação não pode ser desfeita.`)) return
    setCancelling(true)
    setActionError(null)
    try {
      await api.post(`/nf-entrada/${id}/cancel`)
      load()
    } catch (e) {
      const msg = extractApiError(e)
      setActionError(msg || 'Erro ao cancelar NF. Tente novamente.')
    } finally {
      setCancelling(false)
    }
  }

  // ── Attach PDF ─────────────────────────────────────────────────────────────

  async function handlePdfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setAttachingPdf(true)
    setUploadProgress(0)
    setActionError(null)
    const formData = new FormData()
    formData.append('pdf', file)
    try {
      await api.post(`/nf-entrada/${id}/attach-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded * 100) / evt.total))
        },
      })
      load()
    } catch (e) {
      const msg = extractApiError(e)
      setActionError(msg || 'Erro ao anexar PDF.')
    } finally {
      setAttachingPdf(false)
      setUploadProgress(null)
    }
  }

  // ── Item link ──────────────────────────────────────────────────────────────

  function openItemSheet(item: NfEntradaItem) {
    setItemForm(buildItemLinkForm(item))
    setItemError(null)
    setProductSearch(item.product?.name ?? item.descricao)
    setNoResultsFor(null)
    setQuickCreate(null)
    setQuickCreateError(null)
    loadBrands()
    setItemSheet({ item })
  }

  function openQuickCreate() {
    if (!itemSheet) return
    const item = itemSheet.item
    setQuickCreate({
      name: item.descricao,
      sku: item.codigo_produto ?? '',
      barcode: item.ean ?? '',
      unit: item.unidade_medida ?? 'UN',
    })
    setQuickCreateError(null)
    setProducts([])
    setNoResultsFor(null)
  }

  async function handleQuickCreate() {
    if (!quickCreate || !quickCreate.name.trim()) {
      setQuickCreateError('Nome do produto é obrigatório.')
      return
    }
    setQuickCreating(true)
    setQuickCreateError(null)
    try {
      const body: Record<string, unknown> = { name: quickCreate.name.trim() }
      if (quickCreate.sku.trim()) body.sku = quickCreate.sku.trim()
      if (quickCreate.barcode.trim()) body.barcode = quickCreate.barcode.trim()
      if (quickCreate.unit.trim()) body.unit = quickCreate.unit.trim()
      const { data } = await api.post<ProductOption>('/products', body)
      setItemForm((f) => ({ ...f, product_id: data.id }))
      setProductSearch(data.name)
      setQuickCreate(null)
    } catch (e) {
      const msg = extractApiError(e)
      setQuickCreateError(msg || 'Erro ao criar produto. Tente novamente.')
    } finally {
      setQuickCreating(false)
    }
  }

  async function handleSaveItemLink() {
    if (!itemSheet) return
    setItemSaving(true)
    setItemError(null)
    const body: Record<string, unknown> = {}
    if (itemForm.product_id) body.product_id = itemForm.product_id
    if (itemForm.brand_id) body.brand_id = itemForm.brand_id
    if (itemForm.lote_numero.trim()) body.lote_numero = itemForm.lote_numero.trim()
    if (itemForm.data_validade) body.data_validade = itemForm.data_validade
    if (itemForm.data_fabricacao) body.data_fabricacao = itemForm.data_fabricacao
    try {
      await api.patch(`/nf-entrada/${id}/items/${itemSheet.item.id}`, body)
      setItemSheet(null)
      load()
    } catch (e) {
      const msg = extractApiError(e)
      setItemError(msg || 'Erro ao vincular item. Tente novamente.')
    } finally {
      setItemSaving(false)
    }
  }

  // ── Bulk brand ─────────────────────────────────────────────────────────────

  function openBulkBrand() {
    setBulkBrandId('')
    setBulkError(null)
    loadBrands()
    setBulkBrandOpen(true)
  }

  async function handleBulkBrand() {
    if (!bulkBrandId) {
      setBulkError('Selecione uma marca.')
      return
    }
    setBulkSaving(true)
    setBulkError(null)
    try {
      await api.patch(`/nf-entrada/${id}/items`, { brand_id: bulkBrandId })
      setBulkBrandOpen(false)
      load()
    } catch (e) {
      const msg = extractApiError(e)
      setBulkError(msg || 'Erro ao aplicar marca. Tente novamente.')
    } finally {
      setBulkSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6 h-9 w-48 animate-pulse rounded-lg bg-surface-alt" />
        <div className="rounded-2xl bg-surface-alt h-44 animate-pulse mb-5" />
        <div className="rounded-xl bg-surface-alt h-64 animate-pulse" />
      </div>
    )
  }

  if (error || !nf) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/notas-entrada')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground -ml-0.5 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Notas de Entrada
        </button>
        <p className="text-muted-foreground">{error ?? 'Nota não encontrada.'}</p>
      </div>
    )
  }

  const isRascunho = nf.status === 'RASCUNHO'
  const linkedCount = nf.items.filter((i) => i.product_id).length
  const totalItems = nf.items.length
  const allLinked = totalItems > 0 && linkedCount === totalItems
  const progressPct = totalItems > 0 ? Math.round((linkedCount / totalItems) * 100) : 0

  return (
    <div className="p-6 space-y-5">
      {/* Back link */}
      <button
        onClick={() => navigate('/notas-entrada')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground -ml-0.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Notas de Entrada
      </button>

      {/* ── Success banner ────────────────────────────────────────────────── */}
      {showBanner && successMessage && (
        <div
          className="flex items-start gap-3 rounded-xl border border-brand-sage/40 bg-brand-sage/10 px-4 py-3.5 animate-in slide-in-from-top-2 fade-in duration-300"
        >
          <CheckCircle2 className="h-4 w-4 text-brand-sage mt-0.5 shrink-0" />
          <p className="text-sm text-brand-brown flex-1">{successMessage}</p>
          <button
            onClick={() => setShowBanner(false)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Fechar"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-brand-forest text-brand-cream overflow-hidden animate-in slide-in-from-top-3 fade-in duration-500">
        <div className="px-7 pt-7 pb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-3xl font-bold text-brand-cream leading-tight font-mono">
                  NF {nf.numero}
                  {nf.serie && <span className="text-brand-cream/60">-{nf.serie}</span>}
                </h1>
                <Badge
                  className={cn(
                    'text-xs border-0 font-medium',
                    nf.status === 'CONFIRMADA'
                      ? 'bg-brand-sage/25 text-brand-sage'
                      : nf.status === 'RASCUNHO'
                      ? 'bg-brand-orange/25 text-brand-orange'
                      : 'bg-white/10 text-white/60',
                  )}
                >
                  {statusLabel(nf.status)}
                </Badge>
              </div>
              {nf.chave_acesso && (
                <p className="mt-1.5 text-brand-cream/50 text-xs font-mono truncate max-w-[420px]" title={nf.chave_acesso}>
                  {nf.chave_acesso}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0 mt-1">
              {/* PDF upload progress bar (during upload) */}
              {attachingPdf && (
                <div className="flex items-center gap-2 min-w-[160px]">
                  <FileText className="h-3.5 w-3.5 text-brand-cream/60 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-brand-cream/60 mb-1">
                      Enviando PDF{uploadProgress !== null ? ` ${uploadProgress}%` : '…'}
                    </p>
                    <ProgressRoot
                      value={uploadProgress}
                      max={100}
                      className="h-1 w-full"
                    >
                      <ProgressTrack className="h-1 rounded-full bg-white/15 overflow-hidden">
                        <ProgressRange
                          className="h-full rounded-full bg-brand-sage transition-all duration-150"
                          style={{ width: `${uploadProgress ?? 0}%` }}
                        />
                      </ProgressTrack>
                    </ProgressRoot>
                  </div>
                </div>
              )}

              {/* Ver PDF — shown whenever pdf_url exists and not uploading */}
              {!attachingPdf && nf.pdf_url && (
                <a
                  href={nf.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-brand-cream/70 hover:text-brand-cream hover:bg-white/10 border border-white/20 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver PDF
                </a>
              )}

              {isRascunho && !attachingPdf && (
                <>
                  {/* Substituir/Anexar PDF */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-brand-cream/70 hover:text-brand-cream hover:bg-white/10 border border-white/20"
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    {nf.pdf_url ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Substituir PDF
                      </>
                    ) : (
                      <>
                        <Paperclip className="h-3.5 w-3.5" />
                        Anexar PDF
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-brand-cream/70 hover:text-brand-cream hover:bg-white/10 border border-white/20 border-red-400/30 hover:border-red-400/50"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {cancelling ? 'Cancelando…' : 'Cancelar NF'}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-brand-sage text-brand-forest hover:bg-brand-sage/90 font-semibold"
                    onClick={handleConfirm}
                    disabled={confirming}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {confirming ? 'Confirmando…' : 'Confirmar NF'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Hidden PDF input */}
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handlePdfFile}
          />

          {/* Info strip */}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5">
            {nf.fornecedor && (
              <span className="text-sm text-brand-cream/70">
                <span className="text-brand-cream/40 text-xs uppercase tracking-wide mr-1.5">Fornecedor</span>
                {nf.fornecedor.razao_social}
              </span>
            )}
            <span className="text-sm text-brand-cream/70">
              <span className="text-brand-cream/40 text-xs uppercase tracking-wide mr-1.5">Emissão</span>
              {formatDate(nf.data_emissao)}
            </span>
            {nf.data_entrada && (
              <span className="text-sm text-brand-cream/70">
                <span className="text-brand-cream/40 text-xs uppercase tracking-wide mr-1.5">Entrada</span>
                {formatDate(nf.data_entrada)}
              </span>
            )}
            <span className="text-sm font-semibold text-brand-cream">
              <span className="text-brand-cream/40 text-xs uppercase tracking-wide mr-1.5 font-normal">Total</span>
              {formatCurrency(nf.valor_total)}
            </span>
          </div>
        </div>

        {/* Observação */}
        {nf.observacao && (
          <div className="border-t border-white/10 bg-white/5 px-7 py-4">
            <p className="text-sm text-brand-cream/60 leading-relaxed">{nf.observacao}</p>
          </div>
        )}

        {actionError && (
          <div className="border-t border-red-500/30 bg-red-500/10 px-7 py-3">
            <p className="text-sm text-red-300">{actionError}</p>
          </div>
        )}
      </div>

      {/* ── Workflow progress (RASCUNHO only) ────────────────────────────── */}
      {isRascunho && totalItems > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-500 delay-150"
          style={{ borderColor: allLinked ? 'oklch(var(--brand-sage) / 0.5)' : 'oklch(var(--brand-orange) / 0.3)' }}
        >
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2.5">
                {allLinked ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-sage/15">
                    <CheckCircle2 className="h-4 w-4 text-brand-sage" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/15">
                    <Link2 className="h-4 w-4 text-brand-orange" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {allLinked ? 'Todos os itens vinculados' : 'Vincule os produtos aos itens'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {linkedCount} de {totalItems} ite{totalItems !== 1 ? 'ns' : 'm'} com produto vinculado
                  </p>
                </div>
              </div>
              {allLinked ? (
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-sage px-4 py-2 text-sm font-semibold text-brand-forest transition-all hover:bg-brand-sage/90 disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {confirming ? 'Confirmando…' : 'Confirmar NF'}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-brand-orange" />
                  {totalItems - linkedCount} pendente{totalItems - linkedCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: allLinked ? 'var(--brand-sage)' : 'var(--brand-orange)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Items table ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-in slide-in-from-bottom-3 fade-in duration-500 delay-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10">
              <Layers className="h-4 w-4 text-brand-orange" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Itens da Nota</h2>
              <p className="text-xs text-muted-foreground">
                {nf.items.length} ite{nf.items.length !== 1 ? 'ns' : 'm'}
              </p>
            </div>
          </div>
          {isRascunho && nf.items.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={openBulkBrand}>
              <Layers className="h-3.5 w-3.5" />
              Marca em lote
            </Button>
          )}
        </div>

        {nf.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
            <FileText className="h-9 w-9 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum item nesta nota</p>
            {isRascunho && (
              <p className="text-xs text-muted-foreground/70">Importe um XML para adicionar itens automaticamente.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong w-10">#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">Descrição</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong hidden lg:table-cell">Código</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-strong">Qtd</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-strong hidden md:table-cell">Vl.Unit</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-strong">Vl.Total</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong hidden xl:table-cell">Lote</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong hidden xl:table-cell">Validade</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong hidden lg:table-cell">Produto</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong hidden lg:table-cell">Marca</th>
                  {isRascunho && <th className="px-3 py-3 w-12" />}
                </tr>
              </thead>
              <tbody>
                {nf.items.map((item, i) => {
                  const needsLink = isRascunho && !item.product_id
                  return (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-border/50 transition-colors hover:bg-surface-alt/60 animate-in fade-in slide-in-from-bottom-1 duration-300',
                      !needsLink && i % 2 === 1 && 'bg-surface-alt/30',
                      needsLink && 'bg-brand-orange/5',
                    )}
                    style={{ animationDelay: `${250 + i * 40}ms`, animationFillMode: 'both' }}
                  >
                    <td className="px-3 py-3 text-muted-foreground text-xs tabular-nums">
                      {item.numero_item}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-foreground leading-tight">{item.descricao}</p>
                      {item.ean && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">EAN: {item.ean}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground font-mono">
                        {item.codigo_produto ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {item.quantidade}
                      {item.unidade_medida && (
                        <span className="text-xs text-muted-foreground ml-1">{item.unidade_medida}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                      {formatCurrency(item.valor_unitario)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-foreground">
                      {formatCurrency(item.valor_total)}
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {item.lote_numero ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.data_validade)}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {item.product ? (
                        <span className="text-xs text-foreground font-medium">{item.product.name}</span>
                      ) : isRascunho ? (
                        <span className="inline-flex items-center gap-1 text-xs text-brand-orange/80 font-medium">
                          <AlertCircle className="h-3 w-3" />
                          Vincular
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {item.brand ? (
                        <span className="text-xs text-foreground">{item.brand.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    {isRascunho && (
                      <td className="px-3 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-7 w-7',
                            needsLink
                              ? 'text-brand-orange hover:text-brand-orange/80 hover:bg-brand-orange/10'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          title="Vincular produto/marca"
                          onClick={() => openItemSheet(item)}
                        >
                          {needsLink ? <Link2 className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
                        </Button>
                      </td>
                    )}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Item link sheet ────────────────────────────────────────────────── */}
      <Sheet open={itemSheet !== null} onOpenChange={(open) => {
        if (!open) {
          setItemSheet(null)
          setQuickCreate(null)
          setQuickCreateError(null)
          setNoResultsFor(null)
        }
      }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Vincular item</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-5">
            {itemSheet && (
              <div className="rounded-lg border border-border bg-surface-alt px-4 py-3">
                <p className="text-sm font-medium text-foreground leading-tight">{itemSheet.item.descricao}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Qtd: {itemSheet.item.quantidade} · {formatCurrency(itemSheet.item.valor_total)}
                </p>
              </div>
            )}

            {/* Product search */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Produto</label>
              {!quickCreate && (
                <Input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    if (!e.target.value) setItemForm((p) => ({ ...p, product_id: '' }))
                  }}
                  placeholder="Buscar produto…"
                />
              )}
              {!quickCreate && products.length > 0 && !itemForm.product_id && (
                <div className="rounded-md border border-border bg-card max-h-48 overflow-y-auto divide-y divide-border/50">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setItemForm((f) => ({ ...f, product_id: p.id }))
                        setProductSearch(p.name)
                        setProducts([])
                        setNoResultsFor(null)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-surface-alt transition-colors',
                        itemForm.product_id === p.id && 'bg-brand-sage/10 font-medium',
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {/* No-results empty state */}
              {!quickCreate && noResultsFor && noResultsFor === productSearch.trim() && !itemForm.product_id && (
                <div className="rounded-lg border border-dashed border-border bg-card px-4 py-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-start gap-2.5">
                    <PackagePlus className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground leading-snug">
                      Nenhum produto encontrado para{' '}
                      <span className="font-medium text-foreground">"{noResultsFor}"</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openQuickCreate}
                    className="w-full rounded-md border border-brand-orange/40 bg-brand-orange/8 px-3 py-2 text-sm font-medium text-brand-orange hover:bg-brand-orange/15 transition-colors flex items-center justify-center gap-2"
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    Criar produto a partir deste item
                  </button>
                </div>
              )}

              {/* Quick-create inline form */}
              {quickCreate && (
                <div className="rounded-lg border border-brand-orange/30 bg-brand-orange/5 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-brand-orange/20">
                    <div className="flex items-center gap-2">
                      <PackagePlus className="h-3.5 w-3.5 text-brand-orange" />
                      <span className="text-xs font-semibold text-brand-orange">Criar novo produto</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setQuickCreate(null); setQuickCreateError(null) }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Cancelar"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-3.5 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Nome *</label>
                      <Input
                        value={quickCreate.name}
                        onChange={(e) => setQuickCreate((q) => q ? { ...q, name: e.target.value } : q)}
                        placeholder="Nome do produto"
                        autoFocus
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">SKU</label>
                        <Input
                          value={quickCreate.sku}
                          onChange={(e) => setQuickCreate((q) => q ? { ...q, sku: e.target.value } : q)}
                          placeholder="Código"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">EAN</label>
                        <Input
                          value={quickCreate.barcode}
                          onChange={(e) => setQuickCreate((q) => q ? { ...q, barcode: e.target.value } : q)}
                          placeholder="Barcode"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Unid.</label>
                        <Input
                          value={quickCreate.unit}
                          onChange={(e) => setQuickCreate((q) => q ? { ...q, unit: e.target.value.toUpperCase() } : q)}
                          placeholder="UN"
                          maxLength={10}
                          className="text-xs uppercase"
                        />
                      </div>
                    </div>
                    {itemSheet?.item.ncm && (
                      <p className="text-xs text-muted-foreground">
                        NCM <span className="font-mono">{itemSheet.item.ncm}</span> — configure dados fiscais no produto após criar
                      </p>
                    )}
                    {quickCreateError && (
                      <p className="text-xs text-destructive">{quickCreateError}</p>
                    )}
                    <Button
                      size="sm"
                      onClick={handleQuickCreate}
                      disabled={quickCreating || !quickCreate.name.trim()}
                      className="w-full bg-brand-orange text-white hover:bg-brand-orange/90"
                    >
                      {quickCreating ? 'Criando…' : 'Criar e vincular'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Selected product chip */}
              {itemForm.product_id && !quickCreate && (
                <div className="flex items-center gap-2 rounded-md bg-brand-sage/10 border border-brand-sage/30 px-3 py-1.5 animate-in fade-in duration-150">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-sage shrink-0" />
                  <span className="text-xs font-medium text-brand-brown flex-1 truncate">{productSearch}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setItemForm((f) => ({ ...f, product_id: '' }))
                      setProductSearch('')
                      setNoResultsFor(null)
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    aria-label="Remover produto"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Brand select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Marca</label>
              <select
                value={itemForm.brand_id}
                onChange={(e) => setItemForm((p) => ({ ...p, brand_id: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Nenhuma</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Lote */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Número do Lote</label>
              <Input
                value={itemForm.lote_numero}
                onChange={(e) => setItemForm((p) => ({ ...p, lote_numero: e.target.value }))}
                placeholder="Ex: LOT2024001"
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Validade</label>
                <Input
                  type="date"
                  value={itemForm.data_validade}
                  onChange={(e) => setItemForm((p) => ({ ...p, data_validade: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Fabricação</label>
                <Input
                  type="date"
                  value={itemForm.data_fabricacao}
                  onChange={(e) => setItemForm((p) => ({ ...p, data_fabricacao: e.target.value }))}
                />
              </div>
            </div>

            {itemError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {itemError}
              </p>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setItemSheet(null)}>Cancelar</Button>
            <Button onClick={handleSaveItemLink} disabled={itemSaving}>
              {itemSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Bulk brand sheet ───────────────────────────────────────────────── */}
      <Sheet open={bulkBrandOpen} onOpenChange={(open) => { if (!open) setBulkBrandOpen(false) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Aplicar marca em todos os itens</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-5">
            <p className="text-sm text-muted-foreground">
              A marca selecionada será aplicada a todos os itens desta nota que ainda não possuem marca vinculada.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Marca *</label>
              <select
                value={bulkBrandId}
                onChange={(e) => setBulkBrandId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              >
                <option value="">Selecione uma marca…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            {bulkError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {bulkError}
              </p>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setBulkBrandOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkBrand} disabled={bulkSaving}>
              {bulkSaving ? 'Aplicando…' : 'Aplicar marca'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
