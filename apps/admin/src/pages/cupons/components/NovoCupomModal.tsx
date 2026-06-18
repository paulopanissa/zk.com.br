import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { type CouponType } from '@/data/cupons.mock'

interface NovoCupomForm {
  code: string
  type: CouponType | ''
  valueCentavos: string
  percentBps: string
  maxUses: string
  validFrom: string
  validUntil: string
  description: string
}

const EMPTY_FORM: NovoCupomForm = {
  code: '',
  type: '',
  valueCentavos: '',
  percentBps: '',
  maxUses: '',
  validFrom: '',
  validUntil: '',
  description: '',
}

interface NovoCupomModalProps {
  open: boolean
  onClose: () => void
  onCreate: (form: NovoCupomForm) => void
}

export function NovoCupomModal({ open, onClose, onCreate }: NovoCupomModalProps) {
  const [form, setForm] = useState<NovoCupomForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof NovoCupomForm, string>>>({})

  function set<K extends keyof NovoCupomForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: key === 'code' ? value.toUpperCase() : value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof NovoCupomForm, string>> = {}
    if (!form.code.trim()) e.code = 'Obrigatório'
    if (!form.type) e.type = 'Obrigatório'
    if (form.type === 'PERCENTUAL' && !form.percentBps) e.percentBps = 'Informe o percentual'
    if (form.type === 'FIXO' && !form.valueCentavos) e.valueCentavos = 'Informe o valor'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onCreate(form)
    setForm(EMPTY_FORM)
    setErrors({})
    onClose()
  }

  function handleClose() {
    setForm(EMPTY_FORM)
    setErrors({})
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Novo cupom</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Código */}
          <Field label="Código *" error={errors.code}>
            <Input
              placeholder="EX: BEMVINDO10"
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              className="font-mono uppercase"
            />
          </Field>

          {/* Tipo */}
          <Field label="Tipo *" error={errors.type}>
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
          </Field>

          {/* Desconto condicional */}
          {form.type === 'PERCENTUAL' && (
            <Field label="Percentual * (ex: 10 = 10%)" error={errors.percentBps}>
              <Input
                type="number"
                min={1}
                max={100}
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
          <Field label="Uso máximo (0 = ilimitado)">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.maxUses}
              onChange={(e) => set('maxUses', e.target.value)}
            />
          </Field>

          {/* Validade */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Válido de">
              <DatePicker
                value={form.validFrom || undefined}
                placeholder="dd/mm/aaaa"
                onValueChange={(v) => set('validFrom', v ?? '')}
              />
            </Field>
            <Field label="Válido até">
              <DatePicker
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Criar cupom
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
