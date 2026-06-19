import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminShell } from '@/components/layout/AdminShell'
import { LoginPage } from '@/pages/login/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ProdutosPage } from '@/pages/produtos/ProdutosPage'
import { EmpresaPage } from '@/pages/empresa/EmpresaPage'
import { ConfiguracoesPage } from '@/pages/configuracoes/ConfiguracoesPage'
import { ClientesPage } from '@/pages/clientes/ClientesPage'
import { ClienteDetalhe } from '@/pages/clientes/ClienteDetalhe'
import { CuponsPage } from '@/pages/cupons/CuponsPage'
import { EstoquePage } from '@/pages/estoque/EstoquePage'
import { PedidosPage } from '@/pages/pedidos/PedidosPage'
import { PedidoDetalhe } from '@/pages/pedidos/PedidoDetalhe'
import { CategoriasPage } from '@/pages/categorias/CategoriasPage'
import { MarcasPage } from '@/pages/marcas/MarcasPage'
import { FornecedoresPage } from '@/pages/fornecedores/FornecedoresPage'
import { FornecedorDetalhe } from '@/pages/fornecedores/FornecedorDetalhe'
import { NotasEntradaPage } from '@/pages/notas-entrada/NotasEntradaPage'
import { NotaEntradaDetalhe } from '@/pages/notas-entrada/NotaEntradaDetalhe'
import { LotesPage } from '@/pages/lotes/LotesPage'
import { RelatoriosPage } from '@/pages/relatorios/RelatoriosPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AdminShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/produtos" element={<ProdutosPage />} />
                <Route path="/empresa" element={<EmpresaPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/clientes/:id" element={<ClienteDetalhe />} />
                <Route path="/cupons" element={<CuponsPage />} />
                <Route path="/estoque" element={<EstoquePage />} />
                <Route path="/pedidos" element={<PedidosPage />} />
                <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
                <Route path="/categorias" element={<CategoriasPage />} />
                <Route path="/marcas" element={<MarcasPage />} />
                <Route path="/fornecedores" element={<FornecedoresPage />} />
                <Route path="/fornecedores/:id" element={<FornecedorDetalhe />} />
                <Route path="/notas-entrada" element={<NotasEntradaPage />} />
                <Route path="/notas-entrada/:id" element={<NotaEntradaDetalhe />} />
                <Route path="/lotes" element={<LotesPage />} />
                <Route path="/relatorios" element={<RelatoriosPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AdminShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
