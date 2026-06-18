import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AdminShell } from '@/components/layout/AdminShell'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ProdutosPage } from '@/pages/produtos/ProdutosPage'
import { EmpresaPage } from '@/pages/empresa/EmpresaPage'
import { ConfiguracoesPage } from '@/pages/configuracoes/ConfiguracoesPage'
import { ClientesPage } from '@/pages/clientes/ClientesPage'
import { ClienteDetalhe } from '@/pages/clientes/ClienteDetalhe'
import { CuponsPage } from '@/pages/cupons/CuponsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AdminShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/empresa" element={<EmpresaPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/:id" element={<ClienteDetalhe />} />
          <Route path="/cupons" element={<CuponsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminShell>
    </BrowserRouter>
  )
}
