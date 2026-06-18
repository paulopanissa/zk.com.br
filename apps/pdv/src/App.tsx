import { PDVShell } from '@/components/layout/PDVShell'

export default function App() {
  return (
    <PDVShell isOnline={true} operatorName="Admin" storeName="Zoro&Kaya — Loja Centro">
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-brand-brown">PDV</h1>
          <p className="mt-2 font-accent text-xl text-brand-orange">
            mordedores e petiscos naturais
          </p>
          <p className="mt-4 text-muted-foreground text-sm">
            Shell configurado. Implemente a tela de venda.
          </p>
        </div>
      </div>
    </PDVShell>
  )
}
