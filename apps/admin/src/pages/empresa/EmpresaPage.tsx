import { Building2, MapPin, Phone, Store, CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EMPRESA_MOCK, UNIDADES_MOCK } from '@/data/empresa.mock'

const REGIME_LABEL: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function EmpresaPage() {
  const e = EMPRESA_MOCK

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Empresa</h1>
        <p className="text-sm text-muted-foreground mt-1">Dados cadastrais e unidades</p>
      </div>

      {/* Dados principais */}
      <Section title="Dados da Empresa" icon={Building2}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="Razão Social" value={e.razaoSocial} />
          <Field label="Nome Fantasia" value={e.nomeFantasia} />
          <Field label="CNPJ" value={e.cnpj} />
          <Field label="Inscrição Estadual" value={e.ie} />
          <Field label="Inscrição Municipal" value={e.im} />
          <Field label="Regime Tributário" value={REGIME_LABEL[e.regimeTributario]} />
          <Field label="Site" value={e.siteUrl} />
          <Field label="E-mail DPO" value={e.dpoEmail} />
          <Field label="E-mail Contato" value={e.emailPrincipal} />
        </div>
      </Section>

      {/* Endereço */}
      <Section title="Endereço Sede" icon={MapPin}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="Logradouro" value={`${e.enderecoLogradouro}, ${e.enderecoNumero}`} />
          <Field label="Complemento" value={e.enderecoComplemento} />
          <Field label="Bairro" value={e.enderecoBairro} />
          <Field label="Cidade" value={e.enderecoCidade} />
          <Field label="UF" value={e.enderecoUF} />
          <Field label="CEP" value={e.enderecoCEP} />
        </div>
      </Section>

      {/* Contato */}
      <Section title="Contato" icon={Phone}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Telefone Principal" value={e.telefonePrincipal} />
          <Field label="E-mail" value={e.emailPrincipal} />
        </div>
      </Section>

      {/* Unidades */}
      <Section title="Unidades / Lojas" icon={Store}>
        <div className="space-y-3">
          {UNIDADES_MOCK.map((u) => (
            <div
              key={u.id}
              className={cn(
                'flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors',
                u.ativo ? 'border-border bg-background' : 'border-border/50 bg-muted/30 opacity-70',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-foreground truncate">{u.nome}</p>
                  {u.tipo === 'MATRIZ' && (
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5">
                      MATRIZ
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {u.logradouro} — {u.cidade}/{u.uf}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:block">{u.timezone}</span>
                {u.ativo ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
