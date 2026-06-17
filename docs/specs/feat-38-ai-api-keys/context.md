# Context — API Keys de IA (Spec 19)

## Motivação
Módulo 19 do PRD. Pré-requisito para spec 27 (Integração de IA). Unidades precisam configurar credenciais de provedores de LLM para que a API gere descrições, SEO e Schema.org automaticamente.

## O que foi implementado

### Endpoints
- `POST /ai-keys` — cadastra key; criptografa antes de persistir
- `GET /ai-keys?provider=OPENAI` — lista keys da unidade (valor mascarado: `sk-abc1...ef89`)
- `GET /ai-keys/:id` — detalhe de uma key (mascarada)
- `PATCH /ai-keys/:id` — atualiza label, valor ou status
- `DELETE /ai-keys/:id` — remove key
- `POST /ai-keys/:id/test` — faz chamada real ao provedor, retorna `{ ok, latency_ms, error? }`

### Provedores suportados
- OPENAI — `POST /v1/chat/completions`, Bearer token, modelo gpt-4o-mini
- DEEPSEEK — `POST /chat/completions`, Bearer token, modelo deepseek-chat
- GOOGLE_GEMINI — `POST /v1beta/models/gemini-1.5-flash:generateContent`, x-goog-api-key header
- ANTHROPIC — `POST /v1/messages`, x-api-key header

## Decisões de Arquitetura

1. **Criptografia**: `CryptoService.encrypt()` (AES-256-GCM) antes de persistir. Valor nunca em texto claro no banco.
2. **Mascaramento**: `key_masked` = primeiros 6 + últimos 4 chars, resto `****`. Valor real nunca retornado pela API.
3. **Unicidade**: `@@unique([unidade_id, provider, label])` — mesma unidade pode ter múltiplas keys do mesmo provedor com labels diferentes.
4. **Test endpoint**: chamada real com max_tokens=1, timeout 10s. Atualiza `last_tested_at`, `last_test_ok`, `last_test_latency_ms` no registro.
5. **`resolveActiveKey`**: método interno exportado para uso pelo módulo de IA (spec 27) — retorna valor descriptografado para uso em runtime.
6. **RBAC**: apenas ADMINISTRADOR. Decorator `@Roles` no nível do controller (aplica a todos os endpoints).
7. **Tenancy**: `resolveUnitId` no início de cada operação de serviço.

## Invariantes respeitados
- Credencial nunca em texto claro no banco (`key_encrypted`)
- Valor nunca retornado nas respostas HTTP (apenas `key_masked`)
- Todas queries isoladas por `unidade_id` do contexto autenticado
