import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { type LgpdTipo, TIPO_CONFIG } from '../types'

interface NovaLgpdForm {
  customer_id: string
  tipo: LgpdTipo | ''
  descricao: string
}

const EMPTY_FORM: NovaLgpdForm = {
  customer_id: '',
  tipo: '',
  descricao: '',
}

interface NovaLgpdModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function NovaLgpdModal({ open, onClose, onSaved }: NovaLgpdModalProps) {
  const [form, setForm] = useState<NovaLgpdForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof NovaLgpdForm, string>>>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY_FORM)
    setErrors({})
    setApiError(null)
  }, [open])

  function set(field: keyof NovaLgpdForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof NovaLgpdForm, string>> = {}
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!form.customer_id.trim()) {
      e.customer_id = 'Obrigatório'
    } else if (!uuidRegex.test(form.customer_id.trim())) {
      e.customer_id = 'ID inválido (UUID esperado)'
    }
    if (!form.tipo) e.tipo = 'Obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setApiError(null)
    try {
      const payload: Record<string, unknown> = {
        customer_id: form.customer_id.trim(),
        tipo: form.tipo,
      }
      if (form.descricao.trim()) payload.descricao = form.descricao.trim()
      await api.post('/lgpd/requests', payload)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      setApiError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Não foi possível criar a solicitação.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-display">Nova solicitação LGPD</SheetTitle>
        </SheetHeader>

        <form id="nova-lgpd-form" onSubmit={handleSubmit}>
          <SheetBody className="space-y-5">
            <Field label="ID do titular *" error={errors.customer_id}>
              <Input
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={form.customer_id}
                onChange={(e) => set('customer_id', e.target.value)}
                autoFocus
                className="font-mono text-sm"
              />
            </Field>

            <Field label="Tipo de solicitação *" error={errors.tipo}>
              <Select value={form.tipo} onValueChange={(v) => set('tipo', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_CONFIG) as LgpdTipo[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_CONFIG[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Descrição / observações" error={errors.descricao}>
              <textarea
                placeholder="Detalhes adicionais sobre a solicitação (opcional)"
                maxLength={1000}
                rows={4}
                value={form.descricao}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('descricao', e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{form.descricao.length}/1000</p>
            </Field>

            <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              O prazo legal de 15 dias para processamento será contado a partir da criação.
            </div>

            {apiError && <p className="text-sm text-destructive">{apiError}</p>}
          </SheetBody>
        </form>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="nova-lgpd-form" disabled={saving}>
            {saving ? 'Criando…' : 'Criar solicitação'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
