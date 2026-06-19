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
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { type Cupom, type CouponType, TIPO_LABEL } from '../types'

interface CupomForm {
  code: string
  type: CouponType | ''
  valueCentavos: string
  percentBps: string
  maxUses: string
  validFrom: string
  validUntil: string
  description: string
  active: string
}

const EMPTY_FORM: CupomForm = {
  code: '',
  type: '',
  valueCentavos: '',
  percentBps: '',
  maxUses: '',
  validFrom: '',
  validUntil: '',
  description: '',
  active: 'ativo',
}

function cupomToForm(c: Cupom): CupomForm {
  return {
    code: c.code,
    type: c.type,
    valueCentavos: c.value_centavos ? String(c.value_centavos / 100) : '',
    percentBps: c.percent_bps ? String(c.percent_bps / 100) : '',
    maxUses: c.max_uses ? String(c.max_uses) : '',
    validFrom: c.valid_from ?? '',
    validUntil: c.valid_until ?? '',
    description: c.description ?? '',
    active: c.active ? 'ativo' : 'inativo',
  }
}

interface NovoCupomModalProps {
  open: boolean
  onClose: () => void
  cupom?: Cupom | null
  onSaved: () => void
}

export function NovoCupomModal({ open, onClose, cupom, onSaved }: NovoCupomModalProps) {
  const isEdit = !!cupom
  const [form, setForm] = useState<CupomForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof CupomForm, string>>>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(cupom ? cupomToForm(cupom) : EMPTY_FORM)
    setErrors({})
    setApiError(null)
  }, [open, cupom])

  function set(key: keyof CupomForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: key === 'code' ? value.toUpperCase() : value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof CupomForm, string>> = {}
    if (!isEdit && !form.code.trim()) e.code = 'Obrigatório'
    if (!isEdit && !form.type) e.type = 'Obrigatório'
    if (form.type === 'PERCENTUAL' && !form.percentBps) e.percentBps = 'Informe o percentual'
    if (form.type === 'FIXO' && !form.valueCentavos) e.valueCentavos = 'Informe o valor'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setApiError(null)
    try {
      if (isEdit) {
        const payload: Record<string, unknown> = {
          description: form.description.trim() || null,
          active: form.active === 'ativo',
          valid_from: form.validFrom || null,
          valid_until: form.validUntil || null,
        }
        if (form.maxUses) payload.max_uses = parseInt(form.maxUses, 10)
        if (form.type === 'PERCENTUAL' && form.percentBps) {
          payload.percent_bps = Math.round(parseFloat(form.percentBps) * 100)
        }
        if (form.type === 'FIXO' && form.valueCentavos) {
          payload.value_centavos = Math.round(parseFloat(form.valueCentavos) * 100)
        }
        await api.patch(`/cupons/${cupom!.id}`, payload)
      } else {
        const payload: Record<string, unknown> = {
          code: form.code.trim(),
          type: form.type,
        }
        if (form.description.trim()) payload.description = form.description.trim()
        if (form.validFrom) payload.valid_from = form.validFrom
        if (form.validUntil) payload.valid_until = form.validUntil
        if (form.maxUses) payload.max_uses = parseInt(form.maxUses, 10)
        if (form.type === 'PERCENTUAL') {
          payload.percent_bps = Math.round(parseFloat(form.percentBps) * 100)
        }
        if (form.type === 'FIXO') {
          payload.value_centavos = Math.round(parseFloat(form.valueCentavos) * 100)
        }
        await api.post('/cupons', payload)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      setApiError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Não foi possível salvar. Verifique os dados e tente novamente.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-display">{isEdit ? 'Editar cupom' : 'Novo cupom'}</SheetTitle>
        </SheetHeader>

        <form id="cupom-form" onSubmit={handleSubmit}>
          <SheetBody className="space-y-5">
            {/* Código */}
            <Field label="Código *" error={errors.code}>
              {isEdit ? (
                <p className="font-mono text-sm font-semibold text-foreground py-2">{form.code}</p>
              ) : (
                <Input
                  placeholder="EX: BEMVINDO10"
                  value={form.code}
                  onChange={(e) => set('code', e.target.value)}
                  className="font-mono uppercase"
                  autoFocus
                />
              )}
            </Field>

            {/* Tipo */}
            <Field label="Tipo *" error={errors.type}>
              {isEdit ? (
                <p className="text-sm text-foreground py-2">{TIPO_LABEL[form.type as CouponType]}</p>
              ) : (
                <Select value={form.type} onValueChange={(v) => set('type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTUAL">Percentual (%)</SelectItem>
                    <SelectItem value="FIXO">Valor fixo (R$)</SelectItem>
                    <SelectItem value="FRETE_GRATIS">Frete grátis</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>

            {/* Desconto condicional */}
            {form.type === 'PERCENTUAL' && (
              <Field label="Percentual * (ex: 10 = 10%)" error={errors.percentBps}>
                <Input
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  placeholder="10"
                  value={form.percentBps}
                  onChange={(e) => set('percentBps', e.target.value)}
                />
              </Field>
            )}
            {form.type === 'FIXO' && (
              <Field label="Valor em R$ * (ex: 10.00)" error={errors.valueCentavos}>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  placeholder="10.00"
                  value={form.valueCentavos}
                  onChange={(e) => set('valueCentavos', e.target.value)}
                />
              </Field>
            )}

            {/* Uso máximo */}
            <Field label="Uso máximo (vazio = ilimitado)">
              <Input
                type="number"
                min={1}
                placeholder="ilimitado"
                value={form.maxUses}
                onChange={(e) => set('maxUses', e.target.value)}
              />
            </Field>

            {/* Validade */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Válido de">
                <DatePicker
                  id="dp-valid-from"
                  value={form.validFrom || undefined}
                  placeholder="dd/mm/aaaa"
                  onValueChange={(v) => set('validFrom', v ?? '')}
                />
              </Field>
              <Field label="Válido até">
                <DatePicker
                  id="dp-valid-until"
                  value={form.validUntil || undefined}
                  placeholder="dd/mm/aaaa"
                  onValueChange={(v) => set('validUntil', v ?? '')}
                />
              </Field>
            </div>

            {/* Descrição */}
            <Field label="Descrição">
              <Input
                placeholder="Descrição interna"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>

            {/* Status — apenas em edição */}
            {isEdit && (
              <Field label="Status">
                <Select value={form.active} onValueChange={(v) => set('active', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            {apiError && <p className="text-sm text-destructive">{apiError}</p>}
          </SheetBody>
        </form>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="cupom-form" disabled={saving}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar cupom'}
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
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
