import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

function extractError(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data
    ?.message
  return typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar'
}

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/centro-custo')}
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Novo Centro de Custo</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Defina um nome e uma descrição para o centro de custo
          </p>
        </div>
      </div>

      <div className="max-w-2xl rounded-lg border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Nome *</label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Custos operacionais"
            maxLength={120}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o propósito deste centro de custo..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Criar centro'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/centro-custo')}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
