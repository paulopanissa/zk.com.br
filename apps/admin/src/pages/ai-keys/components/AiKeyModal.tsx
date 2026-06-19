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
import { type AiKey, type AiProvider, PROVIDER_CONFIG } from '../types'

interface AiKeyForm {
  provider: AiProvider | ''
  label: string
  key: string
  active: string
}

const EMPTY_FORM: AiKeyForm = {
  provider: '',
  label: '',
  key: '',
  active: 'ativo',
}

function keyToForm(k: AiKey): AiKeyForm {
  return {
    provider: k.provider,
    label: k.label,
    key: '',
    active: k.active ? 'ativo' : 'inativo',
  }
}

interface AiKeyModalProps {
  open: boolean
  onClose: () => void
  aiKey?: AiKey | null
  onSaved: () => void
}

export function AiKeyModal({ open, onClose, aiKey, onSaved }: AiKeyModalProps) {
  const isEdit = !!aiKey
  const [form, setForm] = useState<AiKeyForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof AiKeyForm, string>>>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(aiKey ? keyToForm(aiKey) : EMPTY_FORM)
    setErrors({})
    setApiError(null)
  }, [open, aiKey])

  function set(key: keyof AiKeyForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof AiKeyForm, string>> = {}
    if (!isEdit && !form.provider) e.provider = 'Obrigatório'
    if (!form.label.trim()) e.label = 'Obrigatório'
    if (!isEdit && !form.key.trim()) e.key = 'Obrigatório'
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
          label: form.label.trim(),
          active: form.active === 'ativo',
        }
        if (form.key.trim()) payload.key = form.key.trim()
        await api.patch(`/ai-keys/${aiKey!.id}`, payload)
      } else {
        await api.post('/ai-keys', {
          provider: form.provider,
          label: form.label.trim(),
          key: form.key.trim(),
        })
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
          <SheetTitle className="font-display">
            {isEdit ? 'Editar chave de API' : 'Nova chave de API'}
          </SheetTitle>
        </SheetHeader>

        <form id="ai-key-form" onSubmit={handleSubmit}>
          <SheetBody className="space-y-5">
            {/* Provider */}
            <Field label="Provedor *" error={errors.provider}>
              {isEdit ? (
                <p className="text-sm text-foreground py-2">{form.provider ? PROVIDER_CONFIG[form.provider as AiProvider].label : ''}</p>
              ) : (
                <Select value={form.provider} onValueChange={(v) => set('provider', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROVIDER_CONFIG) as AiProvider[]).map((p) => (
                      <SelectItem key={p} value={p}>{PROVIDER_CONFIG[p].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            {/* Label */}
            <Field label="Label *" error={errors.label}>
              <Input
                placeholder="Ex: Produção, Staging, Testes"
                maxLength={100}
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
                autoFocus={isEdit}
              />
            </Field>

            {/* API Key */}
            <Field
              label={isEdit ? 'Chave de API (deixe vazio para manter)' : 'Chave de API *'}
              error={errors.key}
            >
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={isEdit ? 'Nova chave (opcional)' : 'sk-...'}
                value={form.key}
                onChange={(e) => set('key', e.target.value)}
                autoFocus={!isEdit}
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
          <Button type="submit" form="ai-key-form" disabled={saving}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar chave'}
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
