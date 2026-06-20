import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

function extractError(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
  return typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar'
}

interface CreatedCenter {
  id: string
}

export function NovoCentroCustoPage() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setError('Nome é obrigatório')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post<CreatedCenter>('/cost-centers', {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
      })
      navigate(`/centro-custo/${data.id}/editar`, { replace: true })
    } catch (err) {
      setError(extractError(err))
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/centro-custo"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Centro de Custo
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Novo Centro de Custo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie um centro de custo para agrupar despesas fixas e variáveis da operação
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-xl">
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="space-y-5 px-6 py-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="nome">
                Nome <span className="text-destructive">*</span>
              </label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Custos operacionais, Embalagens, Logística"
                maxLength={120}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Máximo 120 caracteres. Será exibido na calculadora de precificação.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="descricao">
                Descrição
              </label>
              <textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o propósito deste centro de custo e quais despesas ele agrupa..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/60 px-6 py-4">
            <p className="text-xs text-muted-foreground">
              Após criar, você poderá adicionar itens de custo fixo e variável.
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/centro-custo')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Criando...' : 'Criar e adicionar itens'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
