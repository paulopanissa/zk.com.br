import { Bell, ChevronDown, Search, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[]
  currentUnit?: string
  userName?: string
  className?: string
}

export function Topbar({
  breadcrumbs,
  currentUnit = 'Loja Centro',
  userName = 'Admin',
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        'flex flex-col border-b border-border bg-surface',
        className,
      )}
    >
      {/* Main bar */}
      <div className="flex h-14 items-center gap-4 px-6">
        {/* Omnisearch */}
        <div className="flex flex-1 items-center gap-2 max-w-lg rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground focus-within:border-brand-orange focus-within:ring-1 focus-within:ring-brand-orange transition-colors">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="text"
            placeholder="Buscar produtos, clientes, pedidos..."
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Unit selector */}
          <button className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm text-foreground hover:border-brand-orange transition-colors">
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{currentUnit}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {/* Notifications */}
          <button className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-alt transition-colors">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-orange" />
          </button>

          {/* User */}
          <button className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-surface-alt transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-brown text-brand-cream text-xs font-semibold">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-foreground">{userName}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 px-6 pb-2 text-sm">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              {item.href ? (
                <a
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </header>
  )
}
