import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { api } from '@/lib/api'
import {
  type AlertaRegra,
  type AlertType,
  type AlertThresholdUnit,
  ALERT_TYPE_CONFIG,
  DEFAULT_THRESHOLD,
  hasThreshold,
} from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  regra?: AlertaRegra | null
  onSaved: () => void
}

interface FormState {
  type: AlertType
  name: string
  threshold_value: number
  threshold_unit: AlertThresholdUnit
  product_id: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AlertaRuleModal({ open, onClose, regra, onSaved }: Props) {
  const isEdit = !!regra

  const [form, setForm] = useState<FormState>({
    type: 'ESTOQUE_BAIXO',
    name: '',
    threshold_value: 5,
    threshold_unit: 'UNIDADES',
    product_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (regra) {
      setForm({
        type: regra.type,
        name: regra.name,
        threshold_value: regra.threshold_value,
        threshold_unit: regra.threshold_unit,
        product_id: regra.product_id ?? '',
      })
    } else {
      setForm({
        type: 'ESTOQUE_BAIXO',
        name: '',
        threshold_value: DEFAULT_THRESHOLD.ESTOQUE_BAIXO.value,
        threshold_unit: DEFAULT_THRESHOLD.ESTOQUE_BAIXO.unit,
        product_id: '',
      })
    }
    setError(null)
  }, [open, regra])

  function handleTypeChange(type: AlertType) {
    const def = DEFAULT_THRESHOLD[type]
    setForm((prev) => ({ ...prev, type, threshold_value: def.value, threshold_unit: def.unit }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const showThreshold = hasThreshold(form.type)
      const payload = {
        name: form.name.trim(),
        threshold_value: showThreshold ? form.threshold_value : 0,
        threshold_unit: showThreshold ? form.threshold_unit : 'NENHUM',
        product_id: form.product_id.trim() || null,
        ...(!isEdit && { type: form.type }),
      }
      if (isEdit) {
        await api.patch(`/alertas/regras/${regra!.id}`, payload)
      } else {
        await api.post('/alertas/regras', payload)
      }
      onSaved()
      onClose()
    } catch {
      setError('Não foi possível salvar. Verifique os dados e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const showThreshold = hasThreshold(form.type)

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar regra de alerta' : 'Nova regra de alerta'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tipo — apenas na criação */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tipo de alerta</label>
              <Select value={form.type} onValueChange={(v) => handleTypeChange(v as AlertType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ALERT_TYPE_CONFIG) as AlertType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {ALERT_TYPE_CONFIG[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nome da regra</label>
            <Input
              required
              maxLength={100}
              placeholder="Ex: Estoque crítico — Ração Premium"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Threshold — apenas para tipos que suportam */}
          {showThreshold && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Threshold</label>
                <Input
                  type="number"
                  min={0}
                  value={form.threshold_value}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, threshold_value: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Unidade</label>
                <Select
                  value={form.threshold_unit}
                  onValueChange={(v) => setForm((p) => ({ ...p, threshold_unit: v as AlertThresholdUnit }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNIDADES">Unidades</SelectItem>
                    <SelectItem value="BPS">BPS (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {showThreshold && form.threshold_unit === 'BPS' && form.threshold_value > 0 && (
            <p className="text-xs text-muted-foreground -mt-1">
              {form.threshold_value} BPS = {(form.threshold_value / 100).toFixed(1)}%
            </p>
          )}

          {/* Produto específico */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Produto específico{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Input
              placeholder="UUID do produto — deixe vazio para todos os produtos"
              value={form.product_id}
              onChange={(e) => setForm((p) => ({ ...p, product_id: e.target.value }))}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar regra'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
