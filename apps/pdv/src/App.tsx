import { useState } from 'react'
import { PDVShell } from '@/components/layout/PDVShell'
import { VendaScreen } from '@/pages/venda/VendaScreen'
import { AberturaCaixaScreen } from '@/pages/caixa/AberturaCaixaScreen'
import { FechamentoCaixaScreen } from '@/pages/caixa/FechamentoCaixaScreen'

type CaixaStatus = 'fechado' | 'aberto' | 'fechando'

const STORE_NAME = 'Zoro&Kaya — Loja Centro'
const OPERATOR_NAME = 'Admin'

export default function App() {
  const [caixaStatus, setCaixaStatus] = useState<CaixaStatus>('fechado')
  const [fundoCentavos, setFundoCentavos] = useState(0)

  function handleAbrir(fundo: number) {
    setFundoCentavos(fundo)
    setCaixaStatus('aberto')
  }

  function handleFechar() {
    setCaixaStatus('fechado')
    setFundoCentavos(0)
  }

  if (caixaStatus === 'fechado') {
    return (
      <AberturaCaixaScreen
        storeName={STORE_NAME}
        operatorName={OPERATOR_NAME}
        onAbrir={handleAbrir}
      />
    )
  }

  return (
    <PDVShell
      isOnline={true}
      operatorName={OPERATOR_NAME}
      storeName={STORE_NAME}
      onFecharCaixa={() => setCaixaStatus('fechando')}
    >
      {caixaStatus === 'fechando' ? (
        <FechamentoCaixaScreen
          fundoCentavos={fundoCentavos}
          onFechar={handleFechar}
          onCancelar={() => setCaixaStatus('aberto')}
        />
      ) : (
        <VendaScreen />
      )}
    </PDVShell>
  )
}
