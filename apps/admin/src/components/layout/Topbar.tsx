import { useState } from 'react'
import { Bell, ChevronDown, LogOut, Search, Settings, Store, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NOTIFICATION_COUNT = 0 // TODO: integrar endpoint de notificações
// TODO: carregar lista de unidades do contexto de auth quando disponível
const STORE_UNITS = [{ id: 1, name: 'Loja Centro' }]

interface BreadcrumbItem {
  label: string
  href?: string
}

interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

export function Topbar({ breadcrumbs, className }: TopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const userName = user?.name ?? 'Admin'
  const userInitials = userName.slice(0, 2).toUpperCase()
  const userEmail = user?.email ?? ''
  const [activeUnit, setActiveUnit] = useState(STORE_UNITS[0])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/?search=${encodeURIComponent(q)}`)
    setMobileSearchOpen(false)
  }

  return (
    <header className={cn('flex flex-col border-b border-border bg-surface', className)}>
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">

        {/* Omnisearch — desktop */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground focus-within:border-brand-orange focus-within:ring-1 focus-within:ring-brand-orange transition-colors"
        >
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produtos, clientes, pedidos..."
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="shrink-0">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </form>

        {/* Mobile search toggle */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen((v) => !v)}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-alt transition-colors"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Spacer on desktop when needed */}
        <div className="hidden md:block" />

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1 md:gap-2">

          {/* Unit selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm text-foreground hover:border-brand-orange transition-colors focus:outline-none">
                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden lg:inline">{activeUnit.name}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Unidade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STORE_UNITS.map((unit) => (
                <DropdownMenuItem
                  key={unit.id}
                  onClick={() => setActiveUnit(unit)}
                  className={cn(activeUnit.id === unit.id && 'font-medium text-brand-orange')}
                >
                  <Store className="mr-2 h-4 w-4" />
                  {unit.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-alt transition-colors focus:outline-none">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {NOTIFICATION_COUNT > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white leading-none">
                    {NOTIFICATION_COUNT > 9 ? '9+' : NOTIFICATION_COUNT}
                  </span>
                )}
                {NOTIFICATION_COUNT === 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-orange" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {NOTIFICATION_COUNT === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </div>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-surface-alt transition-colors focus:outline-none">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-brown text-brand-cream text-xs font-semibold shrink-0">
                  {userInitials}
                </div>
                <span className="hidden lg:block text-sm font-medium text-foreground max-w-[140px] truncate">
                  {userName}
                </span>
                <ChevronDown className="hidden lg:block h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground">{userName}</span>
                {userEmail && (
                  <span className="text-xs font-normal text-muted-foreground truncate">{userEmail}</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 md:px-6 pb-2 text-sm">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              {item.href ? (
                <a href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Mobile search bar — expands below topbar */}
      {mobileSearchOpen && (
        <form
          onSubmit={handleSearchSubmit}
          className="md:hidden flex items-center gap-2 border-t border-border bg-background px-4 py-2"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produtos, clientes, pedidos..."
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </form>
      )}
    </header>
  )
}
