import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleDollarSign, Edit2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { CostCenter } from './utils'

const LIMIT = 20

export function CentroCustoPage() {
  const navigate = useNavigate()

  const [centers, setCenters] = useState<CostCenter[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<CostCenter | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadCenters = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const { data } = await api.get<{ data: CostCenter[]; total: number }>('/cost-centers', {
        params: { page, limit: LIMIT },
      })
      setCenters(data.data)
      setTotal(data.total)
    } catch {
      setListError('Erro ao carregar centros de custo')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadCenters()
  }, [loadCenters])

  async function toggleCenter(center: CostCenter) {
    if (togglingId) return
    setTogglingId(center.id)
    setToggleError(null)
    try {
      await api.patch(`/cost-centers/${center.id}`, { ativo: !center.ativo })
      setCenters((prev) =>
        prev.map((c) => (c.id === center.id ? { ...c, ativo: !c.ativo } : c)),
      )
    } catch {
      setToggleError('Erro ao alterar status')
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setDeleteError(null)
    try {
      await api.delete(`/cost-centers/${deleteTarget.id}`)
      setCenters((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setTotal((t) => t - 1)
      setDeleteTarget(null)
    } catch {
      setDeleteError('Erro ao excluir centro de custo')
      setDeleteTarget(null)
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Centros de Custo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie custos fixos e variáveis para precificação dos produtos
          </p>
        </div>
        <Button onClick={() => navigate('/centro-custo/novo')} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo centro
        </Button>
      </div>

      {(listError ?? toggleError ?? deleteError) && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError ?? toggleError ?? deleteError}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
          <CircleDollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold text-foreground">Lista de centros</span>
          {!loading && total > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{total} {total === 1 ? 'centro' : 'centros'}</span>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Nome
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                Status
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">
                Criado em
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && centers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <CircleDollarSign className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Nenhum centro cadastrado</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Crie o primeiro centro de custo para começar a precificar.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/centro-custo/novo')}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Criar centro
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            {centers.map((center) => (
              <tr
                key={center.id}
                className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-foreground">{center.nome}</p>
                    {center.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {center.descricao}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 hidden sm:table-cell">
                  <Badge variant={center.ativo ? 'default' : 'secondary'}>
                    {center.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-right text-sm text-muted-foreground hidden md:table-cell">
                  {new Date(center.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/centro-custo/${center.id}/editar`)}
                      className="h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleCenter(center)}
                      disabled={togglingId === center.id}
                      className={cn(
                        'h-8 px-2.5 text-xs font-medium',
                        center.ativo
                          ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
                      )}
                      title={center.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {togglingId === center.id ? '...' : center.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(center)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir centro de custo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{' '}
              <span className="font-medium text-foreground">{deleteTarget?.nome}</span>? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletingId !== null}>
              {deletingId ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
