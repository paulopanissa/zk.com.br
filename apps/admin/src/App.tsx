import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AdminShell } from '@/components/layout/AdminShell'
import { ProdutosPage } from '@/pages/produtos/ProdutosPage'

function DashboardPlaceholder() {
  return (
    <div className="p-6">
      <h1 className="font-display text-3xl font-bold text-brand-brown">Dashboard</h1>
      <p className="mt-2 font-accent text-xl text-brand-orange">mordedores e petiscos naturais</p>
      <p className="mt-4 text-muted-foreground text-sm">Em breve.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminShell>
        <Routes>
          <Route path="/" element={<DashboardPlaceholder />} />
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminShell>
    </BrowserRouter>
  )
}
