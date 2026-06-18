import { AdminShell } from '@/components/layout/AdminShell'

export default function App() {
  return (
    <AdminShell>
      <div className="p-6">
        <h1 className="font-display text-3xl font-bold text-brand-brown">
          Zoro&amp;Kaya ERP
        </h1>
        <p className="mt-2 font-accent text-xl text-brand-orange">
          mordedores e petiscos naturais
        </p>
        <p className="mt-4 text-muted-foreground">
          Design system configurado. Comece a implementar os módulos.
        </p>
      </div>
    </AdminShell>
  )
}
