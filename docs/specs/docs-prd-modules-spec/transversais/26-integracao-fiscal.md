# 26. Integração Fiscal

**Domínio:** Transversal & Infraestrutura
**Prioridade:** P2 — Fase 3 (E-commerce & Fiscal)

> **ATENÇÃO: Este módulo é de fase futura.** Não deve ser implementado nas Fases 1 e 2. Os campos fiscais nas entidades de produto (`NCM`, `CFOP`, `CEST`, `origem`, `CST/CSOSN`) são capturados desde a Fase 1, mas a **emissão** de NFe/NFCe só ocorre aqui.

**Path NestJS (futuro):** `apps/api/src/common/fiscal/`

---

## Responsabilidade

Integrar a API a uma plataforma paga de emissão fiscal (Focus NFe / eNotas / NFe.io) para emitir NFe e NFCe a partir de vendas do PDV e do e-commerce, sem integração direta com a SEFAZ.

## Entidades / Interfaces

### `fiscal_emission` (tabela futura)

```typescript
FiscalEmission {
  id: uuid
  reference_type: 'pdv_sale' | 'ecommerce_order'
  reference_id: uuid              // id da venda ou pedido
  document_type: 'NFe' | 'NFCe'
  provider: FiscalProvider        // plataforma usada na emissão
  provider_emission_id: string    // ID da emissão na plataforma externa
  status: FiscalEmissionStatus
  chave_acesso: string | null     // chave de 44 dígitos após autorização
  xml_key: string | null          // storage key do XML autorizado
  pdf_key: string | null          // storage key do DANFE/DANFCe
  error_message: string | null
  emitted_at: timestamp | null
  created_at: timestamp
  updated_at: timestamp
}

enum FiscalProvider {
  FOCUS_NFE = 'focus_nfe',
  ENOTAS    = 'enotas',
  NFE_IO    = 'nfe_io',
}

enum FiscalEmissionStatus {
  PENDING     = 'pending',
  PROCESSING  = 'processing',
  AUTHORIZED  = 'authorized',
  REJECTED    = 'rejected',
  CANCELLED   = 'cancelled',
  ERROR       = 'error',
}
```

### Interface do FiscalService (futuro)

```typescript
abstract class FiscalService {
  emitNFCe(saleId: uuid): Promise<FiscalEmission>
  emitNFe(orderId: uuid): Promise<FiscalEmission>
  cancelEmission(emissionId: uuid, justification: string): Promise<void>
  getStatus(emissionId: uuid): Promise<FiscalEmissionStatus>
  downloadXml(emissionId: uuid): Promise<Buffer>
  downloadPdf(emissionId: uuid): Promise<Buffer>
}
```

## Endpoints / API Pública (futuros)

| Método | Path | Descrição | Autenticação |
|--------|------|-----------|--------------|
| POST | `/fiscal/emissions/nfce` | Emitir NFCe para venda PDV | Bearer (system) + ADMINISTRADOR ou OPERADOR_PDV |
| POST | `/fiscal/emissions/nfe` | Emitir NFe para pedido e-commerce | Bearer (system) + ADMINISTRADOR |
| POST | `/fiscal/emissions/:id/cancel` | Cancelar emissão | Bearer (system) + ADMINISTRADOR |
| GET | `/fiscal/emissions/:id` | Status e dados da emissão | Bearer (system) |
| GET | `/fiscal/emissions/:id/xml` | Download do XML | Bearer (system) |
| GET | `/fiscal/emissions/:id/pdf` | Download do DANFE/DANFCe | Bearer (system) |
| POST | `/fiscal/webhooks/{provider}` | Webhook da plataforma fiscal | Assinatura verificada do provider |

## Regras de Negócio

- **Nunca integrar diretamente com a SEFAZ.** A emissão é sempre via plataforma paga (Focus NFe, eNotas ou NFe.io) — complexidade e manutenção ficam no provedor.
- A plataforma fiscal é configurável: selecionada e credenciada pelo administrador (API Key da plataforma em configurações, nunca em código).
- Emissão é trabalho pesado: a chamada ao provider roda via fila RabbitMQ (`worker`), nunca dentro da requisição de venda. A resposta da emissão chega por webhook.
- Os campos fiscais do produto (`NCM`, `CFOP`, `CEST`, `origem`, `CST/CSOSN`, alíquotas de ICMS/PIS/COFINS/IPI) devem estar preenchidos antes de emitir — validar antes de enfileirar.
- Webhooks do provider verificados por assinatura HMAC (ou mecanismo equivalente do provider). Requisições sem assinatura válida retornam `401`.
- Webhooks são idempotentes: processamento duplicado do mesmo evento não gera emissão dupla.
- XML e PDF autorizados salvos no `StorageBucket.FISCAL` (módulo 25) com retenção mínima de 5 anos.
- Cancelmento de NFe sujeito ao prazo legal (geralmente 24h após emissão); sistema deve validar prazo.
- Em caso de rejeição pela SEFAZ (via provider), o motivo é registrado em `error_message` e o operador é notificado.
- Seleção da plataforma na Fase 3: comparar Focus NFe / eNotas / NFe.io em termos de preço, limites de emissão e suporte a NFCe antes de implementar.

## Invariantes Críticos

- **Sem integração direta com SEFAZ:** qualquer chamada de emissão que não passe pelo `FiscalService` e pelo provider configurado é uma violação arquitetural.
- **Idempotência de emissão:** uma venda/pedido nunca pode gerar duas emissões autorizadas. Verificar `fiscal_emission` pelo `reference_id` antes de enfileirar nova emissão.
- **XMLs imutáveis:** após autorização, o XML nunca é modificado ou deletado (restrição do `StorageService` para `StorageFolder.INVOICE_XML`).
- **Credenciais do provider fora do código:** API Keys da plataforma fiscal exclusivamente via variáveis de ambiente ou configuração segura — nunca em código-fonte.

## Dependências

- **Upstream (usa):**
  - Plataforma fiscal externa (Focus NFe / eNotas / NFe.io) — a ser selecionada na Fase 3
  - `apps/api/src/common/storage/` — armazenar XML e PDF autorizados
  - `apps/api/src/modules/pdv/` — dados da venda para NFCe
  - `apps/api/src/modules/ecommerce/` — dados do pedido para NFe
  - `apps/api/src/modules/produtos/` — campos fiscais do produto
  - `apps/api/src/modules/configuracoes-empresa/` — dados do emitente (CNPJ, IE, endereço)
  - `apps/api/src/modules/config-impostos/` — alíquotas e regimes tributários
  - RabbitMQ — fila de emissão
  - Redis — idempotência de webhooks

- **Downstream (usado por):**
  - `apps/api/src/modules/pdv/` — trigger de emissão de NFCe pós-venda
  - `apps/api/src/modules/ecommerce/` — trigger de emissão de NFe pós-pedido
  - `apps/api/src/modules/notificacoes-alertas/` — notificar falhas de emissão

## Skills Relevantes

- `fiscal-br` — mandatória: campos fiscais, CNPJ/IE, NCM, CFOP, CEST, CST/CSOSN, regimes tributários
- `nestjs-erp-module` — estrutura do módulo, worker consumer, webhooks
- `seguranca-lgpd` — credenciais em env vars, verificação de assinatura de webhook

## Agentes Relevantes

- `revisor-erp` — após qualquer implementação neste módulo
- `auditor-seguranca-lgpd` — antes de expor o endpoint de webhook ao exterior

## Critérios de Aceite (fase futura)

- [ ] Emissão de NFCe enfileira o trabalho e retorna `202 Accepted` com `emission_id`; não bloqueia a requisição.
- [ ] Webhook do provider com assinatura inválida retorna `401`; nenhuma ação é executada.
- [ ] Webhook processado duas vezes com o mesmo ID de evento não gera segunda emissão.
- [ ] Após autorização, XML e PDF são salvos em `StorageFolder.INVOICE_XML` e `StorageFolder.INVOICE_PDF`.
- [ ] Tentativa de emitir NFCe para produto sem `NCM` preenchido retorna erro de validação antes de enfileirar.
- [ ] Tentativa de cancelar emissão após prazo legal retorna erro com motivo.
- [ ] Credenciais da plataforma fiscal não aparecem em nenhum arquivo versionado.
- [ ] Campos fiscais capturados desde a Fase 1 (NCM, CFOP, CEST, origem, CST/CSOSN) são corretamente mapeados para o payload da plataforma fiscal.
