# 19. API Keys de IA

**Domínio:** Plataforma & Gestão
**Prioridade:** P1
**Path NestJS:** `apps/api/src/modules/ai-keys/`

---

## Responsabilidade

Armazenar e gerenciar de forma segura as credenciais de provedores de IA (OpenAI, DeepSeek, Google Gemini, etc.) utilizadas pelo módulo de Integração de IA (módulo 27), garantindo que nenhuma chave fique exposta no código, logs ou respostas de API.

---

## Entidades

### AiProviderKey

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `provedor` | `enum('OPENAI','DEEPSEEK','GOOGLE_GEMINI','ANTHROPIC','OUTRO')` | Identificador do provedor |
| `nome_exibicao` | `varchar(100)` | Ex: "OpenAI GPT-4o", "DeepSeek Chat" |
| `key_hint` | `varchar(10)` | Últimos 4 caracteres da key para identificação visual (ex: `...Ab3z`); **sem o valor real** |
| `key_encrypted` | `text` | Chave criptografada com AES-256-GCM; chave de criptografia em env var; **nunca retornada em GET** |
| `ambiente` | `enum('SANDBOX','PRODUCAO')` | Separação de chaves por ambiente |
| `ativo` | `boolean` | Default `true`; desativar sem excluir |
| `modelo_padrao` | `varchar(100)` | Ex: `gpt-4o`, `gemini-1.5-pro`; usado pelo módulo de IA como fallback |
| `ultimo_uso_at` | `timestamptz` | Atualizado a cada uso bem-sucedido; `null` se nunca usado |
| `criado_por` | `uuid` | FK → User; rastreabilidade de quem cadastrou |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### AiKeyUsageLog

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `key_id` | `uuid` | FK → AiProviderKey |
| `modulo` | `varchar(100)` | Módulo que fez a chamada (ex: `products.seo`, `products.description`) |
| `tokens_input` | `integer` | Tokens de entrada consumidos |
| `tokens_output` | `integer` | Tokens de saída consumidos |
| `custo_centavos` | `integer` | Custo estimado em centavos; calculado pelo módulo de IA |
| `sucesso` | `boolean` | Se a chamada foi bem-sucedida |
| `erro_codigo` | `varchar(50)` | Código de erro do provedor; `null` se sucesso |
| `created_at` | `timestamptz` | |

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/ai-keys` | `JwtAuthGuard` + `Role('admin')` | Lista chaves cadastradas (sem valores; mostra `key_hint`) |
| `GET` | `/ai-keys/:id` | `JwtAuthGuard` + `Role('admin')` | Detalhe da chave (sem valor; mostra hint e metadata) |
| `POST` | `/ai-keys` | `JwtAuthGuard` + `Role('admin')` | Cadastra nova chave (recebe em texto; criptografa antes de persistir) |
| `PUT` | `/ai-keys/:id` | `JwtAuthGuard` + `Role('admin')` | Atualiza metadados (nome, modelo padrão, ambiente); chave não é alterada por aqui |
| `POST` | `/ai-keys/:id/rotate` | `JwtAuthGuard` + `Role('admin')` | Substitui a chave (recebe nova key; criptografa; invalida anterior) |
| `PATCH` | `/ai-keys/:id/toggle` | `JwtAuthGuard` + `Role('admin')` | Ativa/desativa chave sem excluir |
| `DELETE` | `/ai-keys/:id` | `JwtAuthGuard` + `Role('admin')` | Remove chave (bloquear se for a única ativa de um provedor em uso) |
| `POST` | `/ai-keys/:id/test` | `JwtAuthGuard` + `Role('admin')` | Testa conectividade com o provedor (faz chamada mínima; não retorna conteúdo) |
| `GET` | `/ai-keys/:id/usage` | `JwtAuthGuard` + `Role('admin')` | Histórico de uso paginado da chave (tokens, custo, módulo) |
| `GET` | `/ai-keys/usage/summary` | `JwtAuthGuard` + `Role('admin')` | Resumo agregado de uso e custo estimado por provedor e período |

---

## Regras de Negócio

- Chaves de IA são armazenadas **exclusivamente criptografadas** (AES-256-GCM). A chave de criptografia vem de variável de ambiente e nunca é commitada ou persistida no banco.
- `POST /ai-keys` recebe a chave em texto, deriva o `key_hint` (últimos 4 chars) e persiste apenas o `key_encrypted`. O valor em texto não é armazenado em nenhuma tabela, log de banco ou log de aplicação.
- `GET` em qualquer endpoint retorna apenas `key_hint`, nunca o valor decriptografado.
- Rotação de chave (`POST /ai-keys/:id/rotate`) substitui atomicamente `key_encrypted` e `key_hint`. A chave antiga é descartada imediatamente.
- O módulo de Integração de IA (módulo 27) busca a chave ativa do provedor, decripta em memória no momento do uso e descarta após a chamada. A chave decriptografada nunca trafega pela API pública.
- `AiKeyUsageLog` é preenchido pelo módulo de IA (módulo 27) após cada chamada. Este módulo apenas expõe a leitura.
- Rate limiting por IP no `POST /ai-keys` e `POST /ai-keys/:id/rotate` (prevenção de enumeração).
- Logs de uso são retidos por 90 dias por padrão; política de retenção configurável.

---

## Invariantes Críticos

- **Chave nunca em texto claro no banco, logs ou resposta.** Qualquer vazamento acidental de uma chave de IA pode gerar custos financeiros imediatos e exposição de dados. Esta é a invariante mais crítica deste módulo.
- **`key_hint` não reverte para a chave.** O hint é gerado a partir dos últimos 4 chars para identificação visual; não é suficiente para reconstruir a chave.
- **Rotação atômica.** A troca de chave é feita em uma transação: nova chave entra e antiga é descartada no mesmo commit.
- **Sem log de valor em texto.** Garantir que nenhum middleware de logging (ex: interceptors de request/response) registre o body do `POST /ai-keys` com o campo de chave. Implementar filtro/sanitizador de log.

---

## Dependências

- **Upstream (usa):**
  - Skill `seguranca-lgpd` — criptografia AES-256-GCM, segredos em env vars, sanitização de logs

- **Downstream (usado por):**
  - Módulo `Integração de IA` (módulo 27) — busca e usa as chaves decriptografadas em memória
  - Módulo `Notificações & Alertas` (módulo 20) — pode alertar sobre uso elevado ou erros frequentes de API de IA

---

## Skills Relevantes

- `nestjs-erp-module` — sempre
- `seguranca-lgpd` — criptografia de segredos, sanitização de logs, rate limiting

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações; verificar que nenhum caminho retorna a chave em texto
- `auditor-seguranca-lgpd` — obrigatório antes de qualquer release deste módulo; revisar toda superfície de exposição da chave

---

## Critérios de Aceite

- [ ] `POST /ai-keys` com uma chave válida: a chave não aparece em nenhum campo de resposta, nem em `key_encrypted` na response.
- [ ] `GET /ai-keys` retorna `key_hint` (`...Ab3z`) mas nunca o valor real.
- [ ] `POST /ai-keys/:id/rotate` substitui a chave; `key_hint` atualiza; chamada antiga é invalidada.
- [ ] Interceptor de logging sanitiza o campo da chave no body de `POST /ai-keys` (chave mascarada nos logs).
- [ ] `POST /ai-keys/:id/test` retorna `{ ok: true }` com credenciais válidas e `{ ok: false, error: "..." }` com credenciais inválidas, sem revelar a chave.
- [ ] `DELETE /ai-keys/:id` da única chave ativa de um provedor em uso retorna `409` com mensagem descritiva.
- [ ] Todos os endpoints retornam `403` para usuários sem role `admin`.
- [ ] Todos os endpoints documentados no Swagger com exemplos que mostram `key_hint` mas nunca o valor real.
