# 18. Configuração de Impostos

**Domínio:** Plataforma & Gestão
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/tax-config/`

---

## Responsabilidade

Armazenar as alíquotas e regras fiscais da empresa (ISS, ICMS, IPI, PIS, COFINS) que alimentam o engine de precificação e os campos fiscais dos produtos, garantindo que cálculos de margem e formação de preço reflitam a carga tributária real.

---

## Entidades

### TaxProfile

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `nome` | `varchar(100)` | Ex: "Perfil Simples Nacional", "Perfil Produto Industrializado" |
| `regime_tributario` | `enum('SIMPLES','LUCRO_PRESUMIDO','LUCRO_REAL')` | Deve ser consistente com `CompanySettings.regime_tributario` |
| `descricao` | `text` | Opcional; contexto de uso |
| `ativo` | `boolean` | Default `true` |
| `padrao` | `boolean` | Apenas um perfil padrão por regime; usado como fallback pela engine |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### TaxRate

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `profile_id` | `uuid` | FK → TaxProfile |
| `imposto` | `enum('ISS','ICMS','IPI','PIS','COFINS','DIFAL','FCP')` | Tipo do tributo |
| `aliquota_percentual` | `integer` | Em centésimos de porcento (ex: 1200 = 12,00%); **nunca float** |
| `base_calculo` | `enum('PRECO_VENDA','PRECO_COMPRA','VALOR_AGREGADO')` | Base sobre a qual a alíquota incide |
| `incluso_no_preco` | `boolean` | `true` = imposto já embutido (cálculo por dentro); `false` = calculado por fora |
| `uf_origem` | `char(2)` | Opcional; para regras interestaduais (ICMS/DIFAL) |
| `uf_destino` | `char(2)` | Opcional; para DIFAL |

### NcmTaxOverride

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `ncm` | `varchar(8)` | Código NCM (apenas dígitos) |
| `imposto` | `enum('IPI','PIS','COFINS','ICMS')` | Tributo com alíquota especial por NCM |
| `aliquota_percentual` | `integer` | Em centésimos de porcento |
| `descricao` | `varchar(255)` | Ex: "Alíquota reduzida pet food – NCM 2309.10" |

> A tabela `NcmTaxOverride` permite exceções por NCM sem alterar o perfil geral. O engine de precificação verifica primeiro se existe override para o NCM do produto antes de aplicar o perfil padrão.

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/tax-config/profiles` | `JwtAuthGuard` + `Role('admin')` | Lista perfis fiscais |
| `POST` | `/tax-config/profiles` | `JwtAuthGuard` + `Role('admin')` | Cria perfil fiscal |
| `GET` | `/tax-config/profiles/:id` | `JwtAuthGuard` + `Role('admin')` | Detalhe do perfil com alíquotas |
| `PUT` | `/tax-config/profiles/:id` | `JwtAuthGuard` + `Role('admin')` | Atualiza perfil |
| `DELETE` | `/tax-config/profiles/:id` | `JwtAuthGuard` + `Role('admin')` | Remove perfil (não permitido se `padrao = true` ou em uso) |
| `GET` | `/tax-config/profiles/:id/rates` | `JwtAuthGuard` + `Role('admin')` | Lista alíquotas do perfil |
| `POST` | `/tax-config/profiles/:id/rates` | `JwtAuthGuard` + `Role('admin')` | Adiciona alíquota ao perfil |
| `PUT` | `/tax-config/profiles/:id/rates/:rateId` | `JwtAuthGuard` + `Role('admin')` | Atualiza alíquota |
| `DELETE` | `/tax-config/profiles/:id/rates/:rateId` | `JwtAuthGuard` + `Role('admin')` | Remove alíquota do perfil |
| `GET` | `/tax-config/ncm-overrides` | `JwtAuthGuard` + `Role('admin')` | Lista overrides por NCM |
| `POST` | `/tax-config/ncm-overrides` | `JwtAuthGuard` + `Role('admin')` | Cria override de NCM |
| `PUT` | `/tax-config/ncm-overrides/:id` | `JwtAuthGuard` + `Role('admin')` | Atualiza override |
| `DELETE` | `/tax-config/ncm-overrides/:id` | `JwtAuthGuard` + `Role('admin')` | Remove override |
| `GET` | `/tax-config/effective-rates` | `JwtAuthGuard` + `Role('admin')` | Calcula alíquotas efetivas dado um NCM e perfil (preview para admin) |

---

## Regras de Negócio

- Alíquotas são armazenadas em centésimos de porcento (inteiro) para evitar erros de ponto flutuante. Exemplo: 12% = `1200`, 0,65% = `65`. **Nunca usar `float`.**
- Cada regime tributário pode ter múltiplos perfis (ex: um padrão, um para produtos importados). Apenas um perfil por regime pode ser marcado como `padrao = true`.
- O engine de precificação (módulo 9) sempre consulta este módulo para calcular a carga tributária. A lógica de cálculo vive no engine, não aqui.
- A tabela `NcmTaxOverride` tem prioridade sobre o perfil padrão ao calcular impostos de um produto. O módulo de Produtos (módulo 7) armazena o NCM e o engine faz o join.
- `regime_tributario` do perfil deve ser consistente com o regime da empresa em `CompanySettings`. Alertar (mas não bloquear) se divergir.
- Alterar alíquotas não retroage: vendas já realizadas mantêm os impostos calculados no momento da venda (snapshot na venda).
- ISS é exclusivo de prestadores de serviço; para empresas de comércio (varejo), o ISS não se aplica — validar e alertar se ISS for cadastrado para empresa de regime de comércio.

---

## Invariantes Críticos

- **Alíquotas em inteiro (centésimos de %).** Nenhum campo de alíquota usa `float` ou `decimal(5,2)` — usar `integer` para centésimos de porcento.
- **Engine de precificação como único consumidor.** Nenhum módulo de venda calcula imposto diretamente; toda tributação passa pelo engine (módulo 9).
- **Override por NCM tem prioridade.** O engine deve sempre verificar `NcmTaxOverride` antes de aplicar o perfil geral.

---

## Dependências

- **Upstream (usa):**
  - Módulo `Configurações da Empresa` (módulo 14) — lê `regime_tributario` para consistência
  - Skill `fiscal-br` — conceitos de NCM, CFOP, alíquotas por regime

- **Downstream (usado por):**
  - Módulo `Engine de Precificação` (módulo 9) — principal consumidor das alíquotas
  - Módulo `Produtos` (módulo 7) — campos fiscais do produto referenciam perfil fiscal
  - Módulo `Integração Fiscal` (módulo 26) — usa alíquotas configuradas nos XMLs de NFe/NFCe

---

## Skills Relevantes

- `nestjs-erp-module` — sempre
- `fiscal-br` — conceitos de ICMS, IPI, PIS, COFINS, ISS, NCM e regimes tributários

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações; verificar que alíquotas nunca são float

---

## Critérios de Aceite

- [ ] Alíquota armazenada como inteiro (centésimos de %); input `12.5` converte para `1250` antes de persistir.
- [ ] Apenas um perfil por regime pode ter `padrao = true`; tentativa de criar segundo padrão no mesmo regime retorna `409`.
- [ ] `NcmTaxOverride` tem precedência sobre perfil padrão no cálculo do engine.
- [ ] Tentativa de remover perfil `padrao` retorna erro descritivo.
- [ ] `GET /tax-config/effective-rates?ncm=23091000&profile_id=...` retorna as alíquotas efetivas aplicáveis.
- [ ] Todos os endpoints retornam `403` para usuários sem role `admin`.
- [ ] Todos os endpoints documentados no Swagger.
