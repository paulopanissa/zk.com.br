---
name: seguranca-lgpd
description: Convenções de segurança, privacidade e conformidade com a LGPD deste ERP — criptografia de PII, log de auditoria, consentimento, direitos do titular, rate limiting, separação dos dois realms de usuário e proteção contra invasão. Use SEMPRE que o trabalho envolver autenticação, dados pessoais (nome, CPF/CNPJ, e-mail, telefone), segurança, exposição de dados em endpoints, chaves de API, ou qualquer requisito legal/privacidade — inclusive pedidos como "guarda os dados do cliente" ou "faz o login".
---

# Segurança & LGPD

Segurança e privacidade são requisitos de base do projeto, não remendo. Aplique por padrão.

## Dois realms de usuário (separação rígida)

- Usuários do **sistema** (admin/PDV) e usuários do **e-commerce** vivem em schemas distintos.
- Autenticação, tokens e escopos são separados. Um usuário do e-commerce nunca recebe escopo do sistema, e vice-versa. Nunca uma tabela de usuário única para os dois.

## PII e criptografia

- Dados pessoais sensíveis (CPF/CNPJ, e dados de cliente conforme o cadastro configurável) são **criptografados em repouso**.
- Se precisar buscar por um campo criptografado (ex: localizar cliente por CPF), use hash determinístico ou índice cego dedicado — nunca decripte em massa para filtrar.
- Minimize a coleta: só guarde o que o cadastro configurável daquele ramo realmente exige.

## Consentimento e direitos do titular

- Registre **consentimento versionado** com finalidade e timestamp.
- Implemente os direitos do titular: **exportação** e **exclusão** dos dados sob solicitação (endpoints dedicados, com autenticação do titular).
- Mantenha o canal do **DPO** ativo (e-mail dedicado nas configurações).

## Log de auditoria

Registre acessos e alterações a dados pessoais (quem, quando, o quê). O log de auditoria é append-only e não contém o dado sensível em claro.

## Defesas de aplicação (anti-invasão)

- **Validação rígida** de toda entrada (DTO + `class-validator`, whitelist ativa).
- **Queries parametrizadas** sempre — nunca concatene SQL com input. Use o ORM/query builder.
- **Rate limiting** nos endpoints públicos e de autenticação (proteção a brute force e abuso).
- **Exposição mínima**: respostas só com os campos necessários; nunca devolva hash de senha, tokens internos ou PII desnecessária.
- Headers de segurança (helmet), CORS restrito, HTTPS obrigatório.
- Senhas com hash forte (argon2/bcrypt). Tokens com expiração curta + refresh.

## Segredos e chaves

- Segredos e chaves de API (gateways de pagamento, provedores de IA, serviço fiscal) ficam em variável de ambiente ou secret manager, **nunca no código nem no repositório**.
- Chaves de terceiros guardadas no banco (ex: configuradas pelo usuário) ficam criptografadas.

## Checklist

- [ ] Realms separados; nenhum escopo cruzado.
- [ ] PII criptografada em repouso; coleta minimizada.
- [ ] Consentimento versionado; exportação e exclusão implementadas.
- [ ] Auditoria de acesso/alteração de dados pessoais.
- [ ] Validação, queries parametrizadas, rate limiting, exposição mínima.
- [ ] Segredos fora do código; chaves de terceiros criptografadas.

## Agentes relacionados

- `auditor-seguranca-lgpd` faz a varredura interna de PII, consentimento e segredos.
- `seguranca-ecommerce` cobre a superfície pública da loja.
