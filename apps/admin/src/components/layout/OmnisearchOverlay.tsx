import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, FolderTree, Package, Truck, Users } from 'lucide-react'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface ProductResult { id: string; name: string; sku: string | null; active: boolean }
interface CustomerResult { id: string; nome: string; email: string | null; ativo: boolean }
interface SupplierResult { id: string; razao_social: string; nome_fantasia: string | null; active: boolean }
interface CategoryResult { id: string; name: string; slug: string; active: boolean }
interface BrandResult { id: string; name: string; slug: string; active: boolean }

interface SearchResponse {
  q: string
  took_ms: number
  results: {
    products?: ProductResult[]
    customers?: CustomerResult[]
    suppliers?: SupplierResult[]
    categories?: CategoryResult[]
    brands?: BrandResult[]
  }
}

interface FlatResult {
  id: string
  label: string
  sublabel?: string
  type: 'products' | 'customers' | 'suppliers' | 'categories' | 'brands'
  href: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_META: Record<FlatResult['type'], { label: string; icon: React.ElementType }> = {
  products: { label: 'Produtos', icon: Package },
  customers: { label: 'Clientes', icon: Users },
  suppliers: { label: 'Fornecedores', icon: Truck },
  categories: { label: 'Categorias', icon: FolderTree },
  brands: { label: 'Marcas', icon: Bookmark },
}

function buildHref(type: FlatResult['type'], id: string): string {
  switch (type) {
    case 'products': return `/produtos/${id}/editar`
    case 'customers': return `/clientes/${id}`
    case 'suppliers': return `/fornecedores/${id}`
    case 'categories': return '/categorias'
    case 'brands': return '/marcas'
  }
}

function flattenResults(data: SearchResponse): FlatResult[] {
  const flat: FlatResult[] = []
  const { results } = data

  results.products?.forEach((p) =>
    flat.push({ id: p.id, label: p.name, sublabel: p.sku ?? undefined, type: 'products', href: buildHref('products', p.id) })
  )
  results.customers?.forEach((c) =>
    flat.push({ id: c.id, label: c.nome, sublabel: c.email ?? undefined, type: 'customers', href: buildHref('customers', c.id) })
  )
  results.suppliers?.forEach((s) =>
    flat.push({ id: s.id, label: s.razao_social, sublabel: s.nome_fantasia ?? undefined, type: 'suppliers', href: buildHref('suppliers', s.id) })
  )
  results.categories?.forEach((c) =>
    flat.push({ id: c.id, label: c.name, type: 'categories', href: buildHref('categories', c.id) })
  )
  results.brands?.forEach((b) =>
    flat.push({ id: b.id, label: b.name, type: 'brands', href: buildHref('brands', b.id) })
  )
  return flat
}

// ── Component ──────────────────────────────────────────────────────────────

interface OmnisearchOverlayProps {
  query: string
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}

export function OmnisearchOverlay({ query, onClose, anchorRef }: OmnisearchOverlayProps) {
  const navigate = useNavigate()
  const overlayRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [results, setResults] = useState<FlatResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [searched, setSearched] = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────────

  const doSearch = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setSearched(false)
    try {
      const { data } = await api.get<SearchResponse>('/search', {
        params: { q, limit: 5 },
        signal: abortRef.current.signal,
      })
      setResults(flattenResults(data))
      setActiveIdx(0)
      setSearched(true)
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'CanceledError' && (err as { name?: string }).name !== 'AbortError') {
        setResults([])
        setSearched(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Click outside ────────────────────────────────────────────────────────

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        overlayRef.current && !overlayRef.current.contains(target) &&
        anchorRef.current && !anchorRef.current.contains(target)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose, anchorRef])

  // ── Keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (results.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = results[activeIdx]
        if (item) {
          navigate(item.href)
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [results, activeIdx, navigate, onClose])

  // ── Render guard ─────────────────────────────────────────────────────────

  if (query.length < 2) return null

  // ── Group results by type ─────────────────────────────────────────────────

  const grouped = results.reduce<Partial<Record<FlatResult['type'], FlatResult[]>>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type]!.push(r)
    return acc
  }, {})

  const typeOrder: FlatResult['type'][] = ['products', 'customers', 'suppliers', 'categories', 'brands']

  return (
    <div
      ref={overlayRef}
      role="listbox"
      aria-label="Resultados da busca"
      className="absolute left-0 top-full z-50 mt-1 w-full min-w-[320px] rounded-xl border border-border bg-card shadow-lg overflow-hidden"
    >
      {loading && (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Buscando...
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum resultado para <span className="font-medium text-foreground">"{query}"</span>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="py-1 max-h-[480px] overflow-y-auto">
          {typeOrder.map((type) => {
            const group = grouped[type]
            if (!group || group.length === 0) return null
            const { label: groupLabel, icon: Icon } = TYPE_META[type]
            return (
              <div key={type}>
                <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border/50 first:border-t-0">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {groupLabel}
                  </span>
                </div>
                {group.map((item) => {
                  const globalIdx = results.indexOf(item)
                  const isActive = globalIdx === activeIdx
                  return (
                    <button
                      key={item.id}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      onClick={() => {
                        navigate(item.href)
                        onClose()
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                        {item.sublabel && (
                          <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
