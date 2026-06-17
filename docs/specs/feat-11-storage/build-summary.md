## Build Summary — feat/11-storage (StorageModule)

Módulo transversal de storage implementado em `apps/api/src/common/storage/` com suporte a três drivers: S3, Cloudflare R2 e LocalDriver (dev/test).
Seleção do driver via `STORAGE_PROVIDER` env; `StorageModule` é `@Global()` e exporta `StorageService` para injeção direta.
MIME detectado via magic bytes (`file-type@16`), keys geradas pelo servidor (UUID), e arquivos fiscais (`fiscal/xml`, `fiscal/pdf`) protegidos contra deleção.
Controller `GET /storage/signed-url` requer `ADMINISTRADOR`; TTL de arquivos fiscais limitado a 600s no controller.
`tsc --noEmit` passou sem erros; ESLint não configurado no projeto (sem `.eslintrc` ou `eslint.config.js`).
