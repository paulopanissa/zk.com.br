import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CircleDollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { extractError } from './utils'

export function NovoCentroCustoPage() {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!nome.trim()) {
      setError('Nome é obrigatório')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/cost-centers', {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
      })
      navigate('/centro-custo')
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Back + page title */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/centro-custo')}
          className="gap-1.5 text-muted-foreground -ml-2 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Centros de custo
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Novo centro de custo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina um nome e descrição para organizar custos de precificação
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
          <CircleDollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold text-foreground">Informações</span>
        </div>

        {/* Card body */}
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Nome <span className="text-destructive">*</span>
            </label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Custos operacionais"
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Descrição{' '}
              <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o propósito deste centro de custo..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Card footer */}
        <div className="flex gap-3 border-t border-border bg-muted/20 px-6 py-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Criando...' : 'Criar centro'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/centro-custo')}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
