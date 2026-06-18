import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface AdminShellProps {
  children: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export function AdminShell({ children, breadcrumbs }: AdminShellProps) {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar currentPath={location.pathname} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
