# PRD — Plataforma ERP + E-commerce + PDV

> Documento de requisitos do produto. Versão de trabalho — captura o escopo e as decisões tomadas até aqui. A parte de E-commerce está mapeada, mas será detalhada numa fase posterior.

---

## 1. Visão geral

Plataforma única de gestão de varejo com três frentes integradas:

- **Admin (ERP)** — núcleo de gestão: catálogo, suprimentos (notas fiscais, lotes, estoque), precificação, clientes, relatórios e configurações.
- **PDV** — frente de caixa, inclusive em operação móvel (feira), com capacidade de funcionar offline para registro de venda.
- **E-commerce** — loja online com base de usuários separada do sistema, faturamento e entrega.

Tudo orientado a uma **API RESTful** como produto central, com os frontends (admin, PDV, e-commerce) consumindo essa API. Prioridades transversais: segurança, prevenção a invasão, privacidade e conformidade com a LGPD.

---

## 2. Problema e contexto

Operações de varejo que vendem em loja física, em feira e online precisam hoje de várias ferramentas desconectadas: um sistema de estoque, uma maquininha sem integração, uma plataforma de e-commerce à parte e planilhas para precificação. Isso gera retrabalho, divergência de estoque entre canais e perda de margem por falta de visibilidade de custo real.

Esta plataforma unifica catálogo, estoque (com rastreio por lote/validade), precificação com custo real e os canais de venda (PDV e e-commerce) sobre uma base única, mantendo o controle fiscal e a conformidade legal.

---

## 3. Objetivos

1. **Estoque confiável e rastreável** — saldo correto por produto e por lote, com baixa automática FIFO por validade, refletido em tempo real entre PDV e e-commerce.
2. **Margem real visível** — toda formação de preço considera custo de compra, impostos, frete, centro de custo e taxa de cartão, expondo a margem em R$ e %.
3. **Venda sem fricção em qualquer cenário** — PDV opera em loja e em feira, inclusive sem internet, sem travar a venda.
4. **Entrada de mercadoria ágil** — dar entrada de produtos via upload do XML da nota do fornecedor, vinculando a lotes automaticamente.
5. **Conformidade por padrão** — LGPD e segurança como requisitos de base, não como remendo posterior.

---

## 4. Fora de escopo (não-objetivos)

- **Multi-tenant no v1** — o sistema nasce single-tenant (uma empresa). A arquitetura isola a camada de tenancy para permitir evolução futura para SaaS sem reescrita, mas o produto multi-empresa não será construído agora.
- **Emissão fiscal no v1** — a emissão de NFe/NFCe será integrada numa fase posterior, via serviço especializado. No início o sistema apenas **consome** o XML da nota do fornecedor.
- **Sincronização offline bidirecional complexa** — o PDV offline registra a venda localmente para controle; não haverá, no v1, resolução automática de conflitos sofisticada nem operação 100% distribuída.
- **Busca avançada do e-commerce** — a busca global do v1 cobre o admin; a busca do e-commerce (facetada, voltada a conversão) fica para a fase do e-commerce.
- **App mobile nativo** — os clientes são web/PWA; não há app nativo dedicado nesta versão.

---

## 5. Decisões de arquitetura (já tomadas)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Tenancy | **Single-tenant** agora; camada de tenancy isolada para virar multi-tenant/SaaS no futuro, personalizando apenas os frontends. |
| 2 | Baixa de estoque | **FIFO por validade** automático, com **override manual** no PDV. |
| 3 | PDV offline | Venda **registrável offline** (estoque, lote, recibo). Pagamento integrado (envio automático do valor à maquininha) é recurso **online**; offline o operador digita na máquina (modo autônomo) e o sistema apenas registra "pago no cartão" para reconciliar depois. |
| 4 | Nota fiscal de entrada | **Dois caminhos**: cadastro manual ou upload de XML (parseia, pré-preenche e guarda o PDF). |
| 5 | Emissão fiscal | **Faseada** e via **plataforma paga** (Focus NFe / eNotas / NFe.io) — não integração direta com a SEFAZ, que é complexa e de manutenção eterna. Campos fiscais do produto (NCM, CFOP, CEST, origem, CST/CSOSN) entram no modelo desde já. |
| 6 | Usuários | **Dois realms separados**: usuários do sistema (admin/PDV) e usuários do e-commerce, em schemas distintos. |
| 7 | Busca global | **PostgreSQL full-text + `pg_trgm`** (sem infra nova); motor dedicado (Meilisearch/Typesense) só se houver milhões de registros + busca instantânea + alta concorrência de busca. |
| 8 | Maquininha do PDV | **Mercado Pago Point (Smart 2 / Pro 3)**, integração via **API Point (nuvem)** — auto-envio do valor exige internet; offline usa modo autônomo. |
| 9 | Gateway de pagamento | **Configurável por canal** nas Configurações (não fixo): gateway do E-commerce e gateway do PDV podem ser iguais ou diferentes. Abstração de provedores (strategy) permite habilitar Mercado Pago, Asaas etc. e mapear por canal **e** por método (cartão na maquininha, PIX, boleto). |
| 10 | Lojas no go-live | **Somente a matriz**. Entidade Unidade existe no modelo (uma linha), pronta para filiais depois. |

---

## 6. Stack técnica

- **Backend:** NestJS (API RESTful)
- **Banco:** PostgreSQL
- **Cache:** Redis (quando necessário)
- **Mensageria/Filas:** RabbitMQ — emissão de nota, sync do PDV, notificações
- **Storage:** S3 ou R2 — logos, mídias de produto, XMLs e PDFs de nota
- **Busca:** PostgreSQL FTS + `pg_trgm`
- **Padrões:** API RESTful, segurança e privacidade by design

---

## 7. Personas

- **Administrador** — configura a empresa, catálogo, fornecedores, impostos, integrações; vê relatórios.
- **Operador de estoque/compras** — dá entrada de notas, gerencia lotes e estoque.
- **Operador de PDV / vendedor** — opera o caixa em loja e em feira.
- **Cliente do e-commerce** — compra online (base de usuários separada).
- **Encarregado de dados (DPO)** — gerencia consentimentos e solicitações LGPD.

---

## 8. Módulos (inventário completo — 28)

### Domínio A — Catálogo & Suprimentos

1. **Marcas** — CRUD com nome, slug e logo (upload ou link).
2. **Fornecedores** — CRUD com CNPJ/CPF validado, contatos, endereço, logo e marcas vinculadas.
3. **Notas Fiscais de entrada** — cadastro manual ou via upload de XML; guarda o PDF; vincula/cadastra fornecedor por CNPJ; aplica marca em lote ou por item; cadastra/vincula os produtos da nota.
4. **Lotes** — vincula produto da nota a um código de lote com validade, para rastrear compras iguais em datas diferentes.
5. **Estoque** — saldo por produto e por lote, com tabela de movimentação (toda entrada/saída), baixa FIFO por validade e tags de lote.
6. **Categorias / Subcategorias** — árvore de classificação.
7. **Produtos** — abas Produto / Mídias / Entregas / Fiscal; preço com simulador de margem; desconto opcional; geração de Schema.org e SEO; campos fiscais (NCM, CFOP, CEST, origem, CST/CSOSN).

### Domínio B — Comercial & Precificação

8. **Centro de Custo** — fixo e variável (frete unitário, sacola, embalagem, etiqueta, caixa).
9. **Engine de Precificação** — cálculo único (usado no helper do produto e na calculadora avulsa): preço de compra + impostos + frete + centro de custo + taxa de cartão → margem em R$ ou %.
10. **Cupons** — desconto real ou percentual, frete grátis e cupom por produto.

### Domínio C — Vendas

11. **PDV** — offline-capable; carrinho; checkout com dinheiro/PIX/cartão (envio automático à máquina quando online; manual quando offline); desconto manual no total; baixa de estoque por lote (FIFO); recibo; reconciliação de pagamento.
12. **Clientes** — cadastro configurável (form-builder dinâmico: label, tipo de campo, validação por regex, opções de select), adaptável por ramo (PET, roupas, etc.).
13. **E-commerce** *(fase posterior)* — catálogo público, carrinho, checkout, pagamento e emissão de NFe; usuários em schema próprio.

### Domínio D — Plataforma & Gestão

14. **Configurações da Empresa** — dados cadastrais (CNPJ/CPF validado), e-mails e telefones tipados, endereços matriz/filial → Unidades/Lojas.
15. **Unidades / Lojas** — estoque e caixa por loja (matriz e filiais).
16. **Configuração de Pagamentos** — registro dos provedores (Asaas, Mercado Pago, Stripe, PagSeguro, PayPal) e seleção **por canal**: gateway do E-commerce e gateway do PDV configuráveis de forma independente (iguais ou diferentes), com mapeamento por método (cartão na maquininha, PIX, boleto).
17. **Configuração de Entregas** — Superfrete, outra API, entrega local (Uber/InDrive).
18. **Configuração de Impostos** — ISS, ICMS, IPI, PIS, COFINS.
19. **API Keys de IA** — OpenAI, DeepSeek, Google etc.
20. **Notificações & Alertas** — regras configuráveis (estoque baixo, vendas, margem, desconto, faixas de preço); limites editáveis.
21. **Relatórios** — vendas, estoque, clientes, compras e produtos (melhores/piores por margem, lucro e vendas; mais vendidos; maior margem; maior desconto; faixas de preço).
22. **LGPD** — consentimento, log de auditoria, exportação e exclusão de dados do titular, criptografia de PII, canal do DPO.

### Transversais & Infraestrutura

23. **Autenticação & Autorização** — dois realms (sistema × e-commerce), papéis e permissões (RBAC).
24. **Busca Global (omnisearch)** — rota única para a searchbar, resultados agrupados por tipo, respeitando permissões.
25. **Storage (S3/R2)** — logos, mídias, XMLs e PDFs.
26. **Integração Fiscal** *(fase posterior)* — emissão de NFe/NFCe via serviço externo.
27. **Integração de IA** — geração de SEO, descrições e Schema.org.
28. **Seeder de dados** — população inicial para desenvolvimento e testes.

---

## 9. User stories (principais)

**Suprimentos**
- Como operador de compras, quero subir o XML da nota do fornecedor para que os produtos e lotes sejam pré-cadastrados automaticamente.
- Como operador de compras, quero aplicar uma marca a todos os itens da nota e ainda trocar item a item, para corrigir exceções.
- Como administrador, quero ver de qual lote vem cada unidade em estoque, para rastrear validade.

**Precificação**
- Como administrador, quero simular o preço a partir do custo real (compra + impostos + frete + centro de custo + cartão) e ver a margem em R$ e %, para não vender no prejuízo.

**PDV**
- Como operador de PDV, quero finalizar a venda escolhendo PIX/cartão e que o valor vá direto para a maquininha quando houver internet, para evitar digitação.
- Como operador de PDV em feira sem internet, quero registrar a venda mesmo offline e cobrar pela máquina em modo autônomo, para não perder a venda.
- Como operador de PDV, quero dar um desconto manual no total da venda, para fechar negócio com o cliente.

**Clientes**
- Como administrador, quero configurar quais campos o cadastro de cliente terá (por ramo), para coletar só o que faz sentido no meu negócio.

**Busca & Gestão**
- Como usuário do sistema, quero buscar qualquer coisa (produto, fornecedor, nota, lote, cliente) numa única searchbar, para navegar rápido.
- Como administrador, quero ser alertado quando estoque, margem ou desconto cruzarem limites que eu defini.

**LGPD**
- Como titular de dados, quero poder solicitar exportação ou exclusão dos meus dados, para exercer meus direitos.

---

## 10. Requisitos por prioridade

### P0 — Must-have (núcleo do ERP)
- Autenticação/Autorização (RBAC) e separação dos dois realms de usuário.
- Empresa, Unidades/Lojas, Marcas, Fornecedores, Categorias.
- Produtos com aba Fiscal e SEO/Schema.org.
- Notas Fiscais de entrada (manual + XML) → Lotes → Estoque com baixa FIFO.
- Centro de Custo e Engine de Precificação.
- Clientes configuráveis.
- Busca Global (Postgres FTS).
- Seeder, Storage, base de segurança e LGPD.

**Critérios de aceite (amostra):**
- [ ] Dado um XML de NFe válido, ao subir o arquivo o sistema extrai fornecedor, itens e valores e permite vincular/cadastrar produtos e lotes.
- [ ] Dada uma venda de um produto com múltiplos lotes, ao confirmar a baixa o sistema consome primeiro o lote de validade mais próxima.
- [ ] Dado um custo de compra, impostos, frete, centro de custo e taxa de cartão, a engine retorna preço sugerido e margem em R$ e %.
- [ ] CNPJ/CPF inválido é rejeitado no cadastro de empresa, fornecedor e cliente.

### P1 — Should-have (vendas)
- PDV (online + offline-capable) com desconto manual e reconciliação.
- Integração de pagamento com a maquininha (envio automático do valor, online).
- Cupons.
- Notificações & Alertas configuráveis.
- Relatórios.

### P2 — Future (fase e-commerce/fiscal)
- E-commerce completo (catálogo, carrinho, checkout, usuários próprios).
- Emissão de NFe/NFCe via serviço fiscal.
- Integrações de entrega (Superfrete/local) e gateways de pagamento online.
- Sincronização offline mais robusta e busca dedicada.

---

## 11. Segurança & LGPD

- **PII criptografada** em repouso (CPF/CNPJ e dados sensíveis de cliente).
- **Consentimento** registrado e versionado; finalidade de uso explícita.
- **Log de auditoria** de acessos e alterações em dados pessoais.
- **Direitos do titular** — exportação e exclusão de dados sob solicitação.
- **Segregação de realms** — usuários do e-commerce nunca compartilham credencial/escopo com usuários do sistema.
- **Defesas de aplicação** — validação rígida de entrada, rate limiting, proteção contra injeção e exposição mínima de dados na API.
- **Canal do DPO** ativo (e-mail dedicado nas configurações).

---

## 12. Escalabilidade & concorrência

A API suporta múltiplas requisições simultâneas sem cair, desde que desenhada conforme abaixo.

- **Modelo de execução** — NestJS sobre Node.js (event loop não-bloqueante) lida bem com alta concorrência de I/O (banco, rede), que é a natureza de um ERP. Trabalho pesado de CPU é delegado a filas (RabbitMQ), nunca executado dentro da requisição.
- **Escala horizontal** — API stateless atrás de load balancer; aumentar a capacidade = subir mais instâncias, não depender de uma máquina forte.
- **Gargalo no banco, não no Node** — pool de conexões, índices adequados e cache no Redis para leituras quentes.
- **Concorrência de estoque (crítico)** — toda baixa passa por operação serializada por produto/lote (`SELECT ... FOR UPDATE` ou decremento atômico) para evitar venda a mais (overselling) em vendas simultâneas da mesma unidade/lote.
- **Idempotência** — endpoints de venda e pagamento são idempotentes; um retry de rede não gera cobrança nem baixa duplicada.
- **Resiliência a integrações externas** — chamadas à maquininha, gateway e serviço fiscal com timeout e isolamento, para que a lentidão de um terceiro não derrube a API.

---

## 13. Métricas de sucesso

**Leading (curto prazo):**
- % de entradas de mercadoria feitas via XML (meta: maioria das notas).
- Tempo médio para dar entrada de uma nota.
- Divergência de estoque entre PDV e sistema (meta: ~0).
- Vendas concluídas em modo offline sem perda.

**Lagging (médio prazo):**
- Margem média real por produto/categoria (visibilidade que antes não existia).
- Redução de rupturas de estoque e de perdas por validade vencida.
- Adoção do PDV em feira.

---

## 14. Faseamento sugerido

- **Fase 1 — Núcleo ERP (P0):** base de gestão, suprimentos, estoque, precificação, clientes, busca, segurança/LGPD.
- **Fase 2 — Vendas (P1):** PDV (online + offline), pagamento integrado, cupons, alertas, relatórios.
- **Fase 3 — E-commerce & Fiscal (P2):** loja online, emissão fiscal, entregas, gateways online.

---

## 15. Decisões resolvidas & pendências

**Resolvidas:**
- **Lojas no go-live:** somente a matriz (Unidade modelada, pronta para filiais depois).
- **Ramo:** pet shop; a API será reaproveitada para outros ERPs/e-commerces no futuro (reforça o isolamento de tenancy desde já).
- **Gateway:** configurável por canal nas Configurações (E-commerce e PDV, iguais ou diferentes), via abstração de provedores. Quais habilitar e o padrão de cada canal é decisão de custo do negócio.
- **Maquininha:** Mercado Pago Point Smart 2 / Pro 3 — integração via API Point (nuvem), confirmando o desenho do PDV offline.
- **Emissão fiscal:** plataforma paga (Focus NFe / eNotas / NFe.io), não integração direta com a SEFAZ. Comparar preços/recursos atuais ao chegar na Fase 3.
- **Concorrência:** suportada via escala horizontal, serialização da baixa de estoque e idempotência (ver seção 12).

**Pendências:**
- **[Eng]** Volume esperado de SKUs e transações para confirmar limiares de busca (Postgres por padrão; migra para motor dedicado só em escala de milhões + busca instantânea + alta concorrência).
- **[Negócio]** Definir quais provedores habilitar e o padrão de cada canal (E-commerce e PDV), conforme tabela de taxas vigente.
- **[Eng/Legal]** Selecionar a plataforma fiscal específica na Fase 3.
