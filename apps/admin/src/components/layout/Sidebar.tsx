import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  Users,
  Tag,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
  ShoppingCart,
  Truck,
  Receipt,
  Shield,
  Bell,
  Key,
  Percent,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  group?: string
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', group: 'Início' },
  { icon: Package, label: 'Produtos', href: '/produtos', group: 'Catálogo' },
  { icon: Layers, label: 'Categorias', href: '/categorias', group: 'Catálogo' },
  { icon: Tag, label: 'Marcas', href: '/marcas', group: 'Catálogo' },
  { icon: Truck, label: 'Fornecedores', href: '/fornecedores', group: 'Catálogo' },
  { icon: Receipt, label: 'Notas de Entrada', href: '/notas-entrada', group: 'Estoque' },
  { icon: Layers, label: 'Lotes', href: '/lotes', group: 'Estoque' },
  { icon: ShoppingCart, label: 'Estoque', href: '/estoque', group: 'Estoque' },
  { icon: Users, label: 'Clientes', href: '/clientes', group: 'Comercial' },
  { icon: Percent, label: 'Cupons', href: '/cupons', group: 'Comercial' },
  { icon: BarChart3, label: 'Relatórios', href: '/relatorios', group: 'Análise' },
  { icon: Bell, label: 'Notificações', href: '/notificacoes', group: 'Sistema' },
  { icon: Key, label: 'API Keys de IA', href: '/ai-keys', group: 'Sistema' },
  { icon: Shield, label: 'LGPD', href: '/lgpd', group: 'Sistema' },
  { icon: Building2, label: 'Empresa', href: '/empresa', group: 'Sistema' },
  { icon: Settings, label: 'Configurações', href: '/configuracoes', group: 'Sistema' },
]

interface SidebarProps {
  currentPath?: string
}

export function Sidebar({ currentPath = '/' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const groups = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const group = item.group ?? 'Outros'
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-brand-forest text-brand-cream transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange text-brand-cream font-display font-bold text-sm">
          Z&amp;K
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display font-bold text-brand-cream leading-tight truncate">
              Zoro&amp;Kaya
            </p>
            <p className="font-accent text-brand-orange text-[11px] leading-tight truncate">
              mordedores e petiscos naturais
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-4">
            {!collapsed && (
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {group}
              </p>
            )}
            {items.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.href
              return (
                <a
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-orange text-brand-cream font-medium'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                    collapsed && 'justify-center',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-2 py-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors text-sm',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
