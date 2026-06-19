import { useCallback, useEffect, useRef, useState } from 'react'
import { Building2, Edit2, Plus, PowerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { maskCep } from '@/lib/formatters'
import { useCepLookup } from '@/hooks/useCepLookup'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnitAddress {
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  municipio: string
  uf: string
  cep: string
}

interface Unit {
  id: string
  nome: string
  slug: string
  tipo: 'MATRIZ' | 'FILIAL'
  cnpj_inscricao: string | null
  ativa: boolean
  permite_venda_offline: boolean
  created_at: string
  address: UnitAddress | null
}

type ModalState = null | { mode: 'create' } | { mode: 'edit'; unit: Unit }

interface FormState {
  nome: string
  tipo: 'MATRIZ' | 'FILIAL'
  cnpj: string
  permite_venda_offline: boolean
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 14) return raw
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

function stripDigits(s: string): string {
  return s.replace(/\D/g, '')
}

function buildInitialForm(): FormState {
  return {
    nome: '',
    tipo: 'FILIAL',
    cnpj: '',
    permite_venda_offline: false,
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    cep: '',
  }
}

function unitToForm(unit: Unit): FormState {
  return {
    nome: unit.nome,
    tipo: unit.tipo,
    cnpj: unit.cnpj_inscricao ? formatCnpj(unit.cnpj_inscricao) : '',
    permite_venda_offline: unit.permite_venda_offline,
    logradouro: unit.address?.logradouro ?? '',
    numero: unit.address?.numero ?? '',
    complemento: unit.address?.complemento ?? '',
    bairro: unit.address?.bairro ?? '',
    municipio: unit.address?.municipio ?? '',
    uf: unit.address?.uf ?? '',
    cep: unit.address?.cep ?? '',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnidadesPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState<FormState>(buildInitialForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { lookup: cepLookup, loading: cepLoading, notFound: cepNotFound } = useCepLookup()
  const unitNumeroRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<Unit[]>('/units', {
        params: includeInactive ? { includeInactive: true } : {},
      })
      .then((r) => setUnits(r.data))
      .catch(() => setError('Não foi possível carregar as unidades.'))
      .finally(() => setLoading(false))
  }, [includeInactive])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setForm(buildInitialForm())
    setFormError(null)
    setModal({ mode: 'create' })
  }

  function openEdit(unit: Unit) {
    setForm(unitToForm(unit))
    setFormError(null)
    setModal({ mode: 'edit', unit })
  }

  function patch(updates: Partial<FormState>) {
    setForm((f) => ({ ...f, ...updates }))
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      setFormError('Nome é obrigatório.')
      return
    }

    const hasAddressField =
      form.logradouro.trim() ||
      form.numero.trim() ||
      form.bairro.trim() ||
      form.municipio.trim() ||
      form.uf.trim() ||
      form.cep.trim()

    if (hasAddressField) {
      const cepDigits = stripDigits(form.cep)
      if (!form.logradouro.trim()) { setFormError('Logradouro é obrigatório quando o endereço é informado.'); return }
      if (!form.numero.trim()) { setFormError('Número é obrigatório quando o endereço é informado.'); return }
      if (!form.bairro.trim()) { setFormError('Bairro é obrigatório quando o endereço é informado.'); return }
      if (!form.municipio.trim()) { setFormError('Município é obrigatório quando o endereço é informado.'); return }
      if (!form.uf.trim() || form.uf.trim().length !== 2) { setFormError('UF deve ter 2 letras.'); return }
      if (cepDigits.length !== 8) { setFormError('CEP deve ter 8 dígitos.'); return }
    }

    setSaving(true)
    setFormError(null)

    try {
      const cnpjDigits = stripDigits(form.cnpj)
      const basicBody: Record<string, unknown> = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        permite_venda_offline: form.permite_venda_offline,
      }
      if (cnpjDigits) basicBody.cnpj_inscricao = cnpjDigits

      let unitId: string

      if (modal?.mode === 'create') {
        const res = await api.post<Unit>('/units', basicBody)
        unitId = res.data.id
      } else {
        unitId = modal!.unit.id
        await api.put<Unit>(`/units/${unitId}`, basicBody)
      }

      if (hasAddressField) {
        await api.put(`/units/${unitId}/address`, {
          logradouro: form.logradouro.trim(),
          numero: form.numero.trim(),
          complemento: form.complemento.trim() || null,
          bairro: form.bairro.trim(),
          municipio: form.municipio.trim(),
          uf: form.uf.trim().toUpperCase(),
          cep: stripDigits(form.cep),
        })
      }

      setModal(null)
      load()
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string | string[] } } }
      const status = err?.response?.status
      const msg = err?.response?.data?.message
      const text = Array.isArray(msg) ? msg[0] : msg

      if (status === 409) {
        if (typeof text === 'string' && text.toLowerCase().includes('matriz')) {
          setFormError('Já existe uma MATRIZ ativa. Desative a atual antes de criar outra.')
        } else if (typeof text === 'string' && text.toLowerCase().includes('slug')) {
          setFormError('Este slug já está em uso por outra unidade.')
        } else {
          setFormError(typeof text === 'string' ? text : 'Conflito ao salvar. Verifique os dados.')
        }
      } else {
        setFormError(typeof text === 'string' ? text : 'Erro ao salvar. Tente novamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(unit: Unit) {
    if (!confirm(`Desativar "${unit.nome}"? A unidade não aparecerá na listagem padrão.`)) return
    try {
      await api.patch(`/units/${unit.id}/deactivate`)
      load()
    } catch {
      alert('Não foi possível desativar. Tente novamente.')
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Unidades</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {units.length} unidade{units.length !== 1 ? 's' : ''}
            {includeInactive && ' (incluindo inativas)'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Incluir inativas
          </label>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova unidade
          </Button>
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
      ) : units.length === 0 ? (
        <EmptyState onNew={openCreate} />
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                  Unidade
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                  CNPJ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-strong">
                  Localização
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-strong">
                  Tipo / Status
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {units.map((unit, i) => (
                <tr
                  key={unit.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-surface-alt/60',
                    i % 2 === 1 && 'bg-surface-alt/30',
                    !unit.ativa && 'opacity-60',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                          unit.tipo === 'MATRIZ'
                            ? 'bg-brand-orange/15 text-brand-orange'
                            : 'bg-surface-alt border border-border text-muted-foreground',
                        )}
                      >
                        {unit.tipo === 'MATRIZ' ? 'M' : 'F'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground leading-snug">{unit.nome}</p>
                        <p className="text-xs font-mono text-muted-foreground">{unit.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {unit.cnpj_inscricao ? formatCnpj(unit.cnpj_inscricao) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {unit.address ? `${unit.address.municipio}, ${unit.address.uf}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        unit.tipo === 'MATRIZ'
                          ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange'
                          : unit.ativa
                          ? 'border-brand-sage/50 bg-brand-sage/20 text-brand-brown'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {unit.tipo === 'MATRIZ' ? 'Matriz' : unit.ativa ? 'Filial ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(unit)}
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {unit.ativa && unit.tipo !== 'MATRIZ' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeactivate(unit)}
                          title="Desativar"
                        >
                          <PowerOff className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sheet: Create / Edit */}
      <Sheet open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {modal?.mode === 'create' ? 'Nova unidade' : 'Editar unidade'}
            </SheetTitle>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {/* Dados básicos */}
            <section className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Dados da Unidade
              </p>

              <div className="space-y-1.5">
                <label htmlFor="unit-nome" className="text-sm font-medium text-foreground">
                  Nome *
                </label>
                <Input
                  id="unit-nome"
                  value={form.nome}
                  onChange={(e) => patch({ nome: e.target.value })}
                  placeholder="Ex: Filial Centro"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Tipo *</label>
                <div className="flex gap-2">
                  {(['FILIAL', 'MATRIZ'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => patch({ tipo: t })}
                      className={cn(
                        'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                        form.tipo === t
                          ? t === 'MATRIZ'
                            ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                            : 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-surface-alt',
                      )}
                    >
                      {t === 'MATRIZ' ? 'Matriz' : 'Filial'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="unit-cnpj" className="text-sm font-medium text-foreground">
                  CNPJ
                </label>
                <Input
                  id="unit-cnpj"
                  value={form.cnpj}
                  onChange={(e) => patch({ cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="unit-offline"
                  type="checkbox"
                  checked={form.permite_venda_offline}
                  onChange={(e) => patch({ permite_venda_offline: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="unit-offline" className="text-sm font-medium text-foreground">
                  Permite venda offline (PDV)
                </label>
              </div>
            </section>

            <div className="border-t border-border" />

            {/* Endereço */}
            <section className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Endereço
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label htmlFor="unit-cep" className="text-sm font-medium text-foreground">
                    CEP{cepLoading && <span className="ml-1 text-xs font-normal text-muted-foreground">buscando…</span>}
                    {cepNotFound && <span className="ml-1 text-xs font-normal text-destructive">não encontrado</span>}
                  </label>
                  <Input
                    id="unit-cep"
                    value={maskCep(form.cep)}
                    placeholder="00000-000"
                    maxLength={9}
                    onChange={async (e) => {
                      const d = stripDigits(e.target.value).slice(0, 8)
                      patch({ cep: d })
                      if (d.length === 8) {
                        const r = await cepLookup(d)
                        if (r) {
                          setForm((f) => ({
                            ...f,
                            logradouro: r.logradouro,
                            bairro: r.bairro,
                            municipio: r.localidade,
                            uf: r.uf,
                          }))
                          unitNumeroRef.current?.focus()
                        }
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="unit-uf" className="text-sm font-medium text-foreground">
                    UF
                  </label>
                  <Input
                    id="unit-uf"
                    value={form.uf}
                    onChange={(e) => patch({ uf: e.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="unit-logradouro" className="text-sm font-medium text-foreground">
                  Logradouro
                </label>
                <Input
                  id="unit-logradouro"
                  value={form.logradouro}
                  onChange={(e) => patch({ logradouro: e.target.value })}
                  placeholder="Rua, Av., Alameda…"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="unit-numero" className="text-sm font-medium text-foreground">
                    Número
                  </label>
                  <Input
                    ref={unitNumeroRef}
                    id="unit-numero"
                    value={form.numero}
                    onChange={(e) => patch({ numero: e.target.value })}
                    placeholder="123"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label htmlFor="unit-complemento" className="text-sm font-medium text-foreground">
                    Complemento
                  </label>
                  <Input
                    id="unit-complemento"
                    value={form.complemento}
                    onChange={(e) => patch({ complemento: e.target.value })}
                    placeholder="Sala, Andar…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="unit-bairro" className="text-sm font-medium text-foreground">
                    Bairro
                  </label>
                  <Input
                    id="unit-bairro"
                    value={form.bairro}
                    onChange={(e) => patch({ bairro: e.target.value })}
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="unit-municipio" className="text-sm font-medium text-foreground">
                    Município
                  </label>
                  <Input
                    id="unit-municipio"
                    value={form.municipio}
                    onChange={(e) => patch({ municipio: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
              </div>
            </section>

            {formError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}
          </SheetBody>

          <SheetFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="font-display text-lg font-bold text-foreground">Nenhuma unidade</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Cadastre as unidades ou lojas do negócio. Toda a operação do ERP é escopada por unidade.
        </p>
        <Button className="mt-4" onClick={onNew}>
          Nova unidade
        </Button>
      </div>
    </div>
  )
}
