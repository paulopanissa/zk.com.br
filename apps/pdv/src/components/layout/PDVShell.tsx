import { Wifi, WifiOff, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PDVShellProps {
  children: React.ReactNode
  isOnline?: boolean
  operatorName?: string
  storeName?: string
  onFecharCaixa?: () => void
}

export function PDVShell({
  children,
  isOnline = true,
  operatorName = 'Operador',
  storeName = 'Zoro&Kaya',
  onFecharCaixa,
}: PDVShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        {/* Logo compacto */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-brand-cream font-display font-bold text-xs">
            Z&amp;K
          </div>
          <div>
            <span className="font-display font-bold text-brand-brown text-sm leading-none">
              {storeName}
            </span>
            <p className="text-[10px] text-muted-foreground leading-none">{operatorName}</p>
          </div>
        </div>

        {/* Right side: status + fechar caixa */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium',
              isOnline
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning',
            )}
          >
            {isOnline ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {onFecharCaixa && (
            <button
              type="button"
              onClick={onFecharCaixa}
              className="flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Fechar caixa"
            >
              <LogOut className="h-3 w-3" />
              Fechar Caixa
            </button>
          )}
        </div>
      </header>

      {/* Offline warning banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-warning/15 px-4 py-2 text-sm text-warning border-b border-warning/20">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Modo offline — vendas serão sincronizadas quando a conexão for restaurada.
          </span>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
