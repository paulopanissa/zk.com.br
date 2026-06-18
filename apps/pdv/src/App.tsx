import { PDVShell } from '@/components/layout/PDVShell'
import { VendaScreen } from '@/pages/venda/VendaScreen'

export default function App() {
  return (
    <PDVShell isOnline={true} operatorName="Admin" storeName="Zoro&Kaya — Loja Centro">
      <VendaScreen />
    </PDVShell>
  )
}
