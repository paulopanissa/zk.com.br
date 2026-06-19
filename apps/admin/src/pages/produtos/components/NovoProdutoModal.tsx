import { useState } from 'react'
import { X, Tag, Layers, Info, DollarSign } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { type NamedItem } from './ProdutosFilter'

interface NovoProdutoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  categorias: NamedItem[]
  marcas: NamedItem[]
}

interface FormState {
  name: string
  sku: string
  barcode: string
  unit: string
  min_stock: string
  active: boolean
  featured: boolean
  category_id: string
  brand_id: string
  description: string
  short_description: string
  cost_price: string
  sale_price: string
  promotional_price: string
  discount_enabled: boolean
  max_discount_pct: string
}

const EMPTY: FormState = {
  name: '',
  sku: '',
  barcode: '',
  unit: '',
  min_stock: '0',
  active: true,
  featured: false,
  category_id: '',
  brand_id: '',
  description: '',
  short_description: '',
  cost_price: '',
  sale_price: '',
  promotional_price: '',
  discount_enabled: false,
  max_discount_pct: '',
}

export function NovoProdutoModal({
  open,
  onClose,
  onSuccess,
  categorias,
  marcas,
}: NovoProdutoModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome é obrigatório'
    if (form.cost_price && isNaN(parseFloat(form.cost_price))) e.cost_price = 'Valor inválido'
    if (form.sale_price && isNaN(parseFloat(form.sale_price))) e.sale_price = 'Valor inválido'
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    setApiError('')

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        active: form.active,
        featured: form.featured,
        min_stock: Math.max(0, parseInt(form.min_stock) || 0),
      }
      if (form.sku.trim()) payload.sku = form.sku.trim()
      if (form.barcode.trim()) payload.barcode = form.barcode.trim()
      if (form.unit.trim()) payload.unit = form.unit.trim()
      if (form.category_id) payload.category_id = form.category_id
      if (form.brand_id) payload.brand_id = form.brand_id
      if (form.description.trim()) payload.description = form.description.trim()
      if (form.short_description.trim()) payload.short_description = form.short_description.trim()

      const { data: created } = await api.post<{ id: string }>('/products', payload)

      const hasPricing = form.cost_price || form.sale_price
      if (hasPricing) {
        const pricing: Record<string, unknown> = {
          discount_enabled: form.discount_enabled,
        }
        if (form.cost_price) pricing.cost_price_cents = Math.round(parseFloat(form.cost_price) * 100)
        if (form.sale_price) pricing.sale_price_cents = Math.round(parseFloat(form.sale_price) * 100)
        if (form.promotional_price) pricing.promotional_price_cents = Math.round(parseFloat(form.promotional_price) * 100)
        if (form.discount_enabled && form.max_discount_pct) pricing.max_discount_pct = parseFloat(form.max_discount_pct)
        await api.patch(`/products/${created.id}/pricing`, pricing)
      }

      setForm(EMPTY)
      setFieldErrors({})
      onSuccess()
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
      setApiError(
        typeof resp === 'string' ? resp : Array.isArray(resp) ? resp[0] : 'Erro ao salvar produto. Tente novamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    setForm(EMPTY)
    setFieldErrors({})
    setApiError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        {/* Sticky header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border px-6 py-4">
          <div>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              Novo produto
            </DialogTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Imagens podem ser adicionadas após o cadastro.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="mt-0.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-7">
            {apiError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {apiError}
              </div>
            )}

            {/* Dados básicos */}
            <FormSection icon={<Tag className="h-4 w-4" />} title="Dados básicos">
              <Field label="Nome *" error={fieldErrors.name}>
                <Input
                  placeholder="Ex: Ração Royal Canin Adulto 15kg"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={fieldErrors.name ? 'border-destructive' : ''}
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU">
                  <Input
                    placeholder="Ex: RC-ADULT-15KG"
                    value={form.sku}
                    onChange={(e) => set('sku', e.target.value)}
                  />
                </Field>
                <Field label="Código de barras">
                  <Input
                    placeholder="EAN-8 / EAN-13 / UPC"
                    value={form.barcode}
                    onChange={(e) => set('barcode', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Unidade">
                  <Input
                    placeholder="Ex: UN, KG, L, CX"
                    value={form.unit}
                    onChange={(e) => set('unit', e.target.value)}
                  />
                </Field>
                <Field label="Estoque mínimo">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.min_stock}
                    onChange={(e) => set('min_stock', e.target.value)}
                  />
                </Field>
              </div>

              <div className="flex gap-3 pt-1">
                <ToggleChip
                  label="Ativo"
                  active={form.active}
                  onClick={() => set('active', !form.active)}
                />
                <ToggleChip
                  label="Destaque"
                  active={form.featured}
                  onClick={() => set('featured', !form.featured)}
                />
              </div>
            </FormSection>

            {/* Classificação */}
            <FormSection icon={<Layers className="h-4 w-4" />} title="Classificação">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoria">
                  <Select
                    value={form.category_id || '__none__'}
                    onValueChange={(v) => set('category_id', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem categoria</SelectItem>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Marca">
                  <Select
                    value={form.brand_id || '__none__'}
                    onValueChange={(v) => set('brand_id', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem marca</SelectItem>
                      {marcas.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FormSection>

            {/* Descrição */}
            <FormSection icon={<Info className="h-4 w-4" />} title="Descrição">
              <Field label="Descrição curta">
                <Input
                  placeholder="Resumo para listagens e e-commerce"
                  value={form.short_description}
                  onChange={(e) => set('short_description', e.target.value)}
                />
              </Field>
              <Field label="Descrição completa">
                <textarea
                  rows={3}
                  placeholder="Detalhes, composição, instruções de uso..."
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className="flex min-h-[76px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </Field>
            </FormSection>

            {/* Precificação */}
            <FormSection icon={<DollarSign className="h-4 w-4" />} title="Precificação">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço de custo (R$)" error={fieldErrors.cost_price}>
                  <PriceInput
                    placeholder="0,00"
                    value={form.cost_price}
                    onChange={(v) => set('cost_price', v)}
                    hasError={!!fieldErrors.cost_price}
                  />
                </Field>
                <Field label="Preço de venda (R$)" error={fieldErrors.sale_price}>
                  <PriceInput
                    placeholder="0,00"
                    value={form.sale_price}
                    onChange={(v) => set('sale_price', v)}
                    hasError={!!fieldErrors.sale_price}
                  />
                </Field>
              </div>

              <Field label="Preço promocional (R$)">
                <PriceInput
                  placeholder="Opcional"
                  value={form.promotional_price}
                  onChange={(v) => set('promotional_price', v)}
                />
              </Field>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <ToggleChip
                  label="Habilitar desconto"
                  active={form.discount_enabled}
                  onClick={() => set('discount_enabled', !form.discount_enabled)}
                />
                {form.discount_enabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Desconto máximo</span>
                    <div className="relative w-24">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="0"
                        value={form.max_discount_pct}
                        onChange={(e) => set('max_discount_pct', e.target.value)}
                        className="pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </FormSection>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Criar produto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="h-px flex-1 bg-border/60" />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function PriceInput({
  placeholder,
  value,
  onChange,
  hasError,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  hasError?: boolean
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        type="number"
        min="0"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('pl-9', hasError && 'border-destructive')}
      />
    </div>
  )
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-primary-foreground' : 'bg-muted-foreground',
        )}
      />
      {label}
    </button>
  )
}
