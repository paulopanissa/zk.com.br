import { FileText, CreditCard, Cog, CheckCircle, XCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TAX_CONFIG_MOCK, PAYMENT_PROVIDERS_MOCK } from '@/data/empresa.mock'

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-sm text-foreground', mono && 'font-mono')}>{value || '—'}</p>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-3">
        <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function TabFiscal() {
  const t = TAX_CONFIG_MOCK
  const isProducao = t.ambiente === 'PRODUCAO'

  return (
    <div className="space-y-4">
      <SectionCard title="Ambiente">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold',
              isProducao
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', isProducao ? 'bg-success' : 'bg-warning')} />
            {isProducao ? 'Produção' : 'Homologação (teste)'}
          </span>
          {!isProducao && (
            <p className="text-xs text-muted-foreground">NFes emitidas não têm validade fiscal</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="CFOP Padrão">
        <div className="grid grid-cols-2 gap-6">
          <Field label="Venda" value={t.cfopPadraoVenda} mono />
          <Field label="Transferência" value={t.cfopPadraoTransferencia} mono />
        </div>
      </SectionCard>

      <SectionCard title="Numeração">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Field label="Série NFCe" value={String(t.serieNFCe)} mono />
          <Field label="Próx. Número NFCe" value={String(t.proxNumeroNFCe)} mono />
          <Field label="Série NFe" value={String(t.serieNFe)} mono />
          <Field label="Próx. Número NFe" value={String(t.proxNumeroNFe)} mono />
        </div>
      </SectionCard>
    </div>
  )
}

const METODO_LABEL: Record<string, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
  MAQUININHA_POINT: 'Maquininha Point',
  BOLETO: 'Boleto',
  DINHEIRO: 'Dinheiro',
}

const CANAL_LABEL: Record<string, string> = {
  PDV: 'PDV',
  ECOMMERCE: 'E-commerce',
  AMBOS: 'PDV + E-commerce',
}

function TabPagamento() {
  return (
    <div className="space-y-4">
      {PAYMENT_PROVIDERS_MOCK.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-sm font-bold text-foreground">{p.provedor}</h3>
              <Badge
                variant="outline"
                className="text-[10px]"
              >
                {CANAL_LABEL[p.canal]}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  p.ambiente === 'PRODUCAO'
                    ? 'border-success/40 text-success bg-success/5'
                    : 'border-warning/40 text-warning bg-warning/5',
                )}
              >
                {p.ambiente === 'PRODUCAO' ? 'Produção' : 'Sandbox'}
              </Badge>
            </div>
            {p.ativo ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Métodos aceitos
            </p>
            <div className="flex flex-wrap gap-2">
              {p.metodos.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {METODO_LABEL[m] ?? m}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TabGeral() {
  return (
    <div className="space-y-4">
      <SectionCard title="Sistema">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <Field label="Nome do sistema" value="Zoro&Kaya ERP" />
          <Field label="Fuso horário padrão" value="America/Sao_Paulo (UTC-3)" />
          <Field label="Idioma" value="Português (Brasil)" />
          <Field label="Moeda" value="BRL — Real Brasileiro" />
          <Field label="Versão" value="1.0.0-alpha" />
        </div>
      </SectionCard>

      <SectionCard title="Integrações ativas">
        <div className="space-y-2">
          {[
            { nome: 'Uber Direct', descricao: 'Entrega express', ativo: true },
            { nome: 'AI Content (Spec 27)', descricao: 'Geração de conteúdo', ativo: true },
            { nome: 'NFe / NFCe', descricao: 'Emissão fiscal (plataforma)', ativo: false },
          ].map((i) => (
            <div key={i.nome} className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">{i.nome}</p>
                <p className="text-xs text-muted-foreground">{i.descricao}</p>
              </div>
              {i.ativo ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function ConfiguracoesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Fiscal, pagamentos e sistema</p>
      </div>

      <Tabs defaultValue="fiscal">
        <TabsList className="mb-4">
          <TabsTrigger value="fiscal" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="pagamento" className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="geral" className="flex items-center gap-1.5">
            <Cog className="h-3.5 w-3.5" />
            Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fiscal">
          <TabFiscal />
        </TabsContent>
        <TabsContent value="pagamento">
          <TabPagamento />
        </TabsContent>
        <TabsContent value="geral">
          <TabGeral />
        </TabsContent>
      </Tabs>
    </div>
  )
}
