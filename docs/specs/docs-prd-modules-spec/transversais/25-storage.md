# 25. Storage (S3/R2)

**Domínio:** Transversal & Infraestrutura
**Prioridade:** P0
**Path NestJS:** `apps/api/src/common/storage/`

---

## Responsabilidade

Prover um serviço transversal de armazenamento de arquivos (logos, mídias de produto, XMLs e PDFs de nota fiscal) sobre S3-compatible (AWS S3 ou Cloudflare R2), com geração de URLs assinadas para acesso privado e isolamento por categoria de arquivo.

## Entidades / Interfaces

Este módulo não possui tabelas próprias. Expõe um `StorageService` consumido por outros módulos e persiste apenas a referência (key/URL) nas entidades dos módulos proprietários.

### Contrato do serviço interno

```typescript
interface UploadResult {
  key: string           // ex: "products/media/uuid-filename.jpg"
  bucket: string
  size: number          // bytes
  mime_type: string
  etag: string
  uploaded_at: Date
}

interface SignedUrlResult {
  url: string           // URL pré-assinada com TTL
  expires_at: Date
}

enum StorageBucket {
  LOGOS     = 'logos',     // logos de empresa, marcas, fornecedores
  MEDIA     = 'media',     // mídias de produto (imagens, vídeos)
  FISCAL    = 'fiscal',    // XMLs e PDFs de notas fiscais
}

enum StorageFolder {
  // Logos
  COMPANY_LOGO    = 'logos/company',
  BRAND_LOGO      = 'logos/brands',
  SUPPLIER_LOGO   = 'logos/suppliers',
  // Mídias
  PRODUCT_MEDIA   = 'media/products',
  // Fiscal
  INVOICE_XML     = 'fiscal/xml',
  INVOICE_PDF     = 'fiscal/pdf',
}
```

### Interface do StorageService

```typescript
abstract class StorageService {
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>
  delete(key: string): Promise<void>
  getSignedUrl(key: string, ttlSeconds: number): Promise<SignedUrlResult>
  getPublicUrl(key: string): string   // apenas para arquivos em buckets/paths públicos (mídias de produto)
  exists(key: string): Promise<boolean>
}

interface UploadOptions {
  folder: StorageFolder
  filename: string              // nome original (sem path)
  mime_type: string
  max_size_bytes: number        // validado antes do upload
  public?: boolean              // padrão false
}
```

## Endpoints / API Pública

O `StorageService` é consumido internamente. Os endpoints de upload ficam nos módulos proprietários (ex: `PATCH /produtos/:id/midias`). O módulo de storage expõe apenas:

| Método | Path | Descrição | Autenticação |
|--------|------|-----------|--------------|
| GET | `/storage/signed-url?key={key}&ttl={segundos}` | Gerar URL assinada para download privado | Bearer (system) |

> **Nota:** O endpoint de URL assinada é de uso interno e do frontend admin. Não expor para o realm e-commerce — mídias de produto para o e-commerce usam URL pública (CDN).

## Regras de Negócio

- **Logos** (`StorageBucket.LOGOS`): acesso privado com URL assinada; TTL padrão 1 hora; substituição apaga o arquivo anterior.
- **Mídias de produto** (`StorageBucket.MEDIA`): acesso público via CDN (URL permanente); sem TTL de assinatura.
- **Fiscal** (`StorageBucket.FISCAL`): acesso privado estrito; URL assinada com TTL máximo de 10 minutos; arquivos nunca deletados manualmente (retenção mínima de 5 anos por obrigação fiscal).
- Tipos MIME permitidos por categoria:
  - Logos: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`
  - Mídias: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`
  - Fiscal XML: `application/xml`, `text/xml`
  - Fiscal PDF: `application/pdf`
- Tamanhos máximos: logos 2 MB; mídias 20 MB; XMLs 5 MB; PDFs 10 MB.
- Keys geradas pelo sistema (UUID + extensão original), nunca pelo cliente — previne path traversal e colisões.
- Uploads realizados pelo backend (server-side upload), nunca presigned upload direto do browser — mantém controle de MIME e tamanho no servidor.
- Ao excluir uma entidade com mídia associada (ex: produto deletado), o arquivo no bucket é deletado em background (via evento ou job); nunca bloqueante na requisição principal.
- Provider configurável via variável de ambiente (`STORAGE_PROVIDER=s3|r2`); credenciais exclusivamente via env vars — nunca hardcoded.
- Em ambiente de desenvolvimento/testes, suporte a provider local (MinIO ou mock) sem necessidade de conta em nuvem.

## Invariantes Críticos

- **XMLs e PDFs fiscais nunca deletados:** operações de delete são proibidas programaticamente para `StorageFolder.INVOICE_XML` e `StorageFolder.INVOICE_PDF`; qualquer chamada a `delete()` nesses paths lança exceção.
- **Keys geradas pelo servidor:** o cliente nunca define o nome do arquivo no bucket. A key é `{folder}/{uuid}.{ext}`.
- **Credenciais fora do código:** `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET_*`, `STORAGE_ENDPOINT` apenas via variáveis de ambiente.
- **Validação de MIME server-side:** o MIME é detectado pelo conteúdo do buffer (magic bytes), não pela extensão ou header `Content-Type` informado pelo cliente.

## Dependências

- **Upstream (usa):**
  - AWS S3 SDK ou Cloudflare R2 (S3-compatible) — via variável `STORAGE_PROVIDER`
  - Variáveis de ambiente: `STORAGE_PROVIDER`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET_LOGOS`, `STORAGE_BUCKET_MEDIA`, `STORAGE_BUCKET_FISCAL`, `STORAGE_CDN_BASE_URL`

- **Downstream (usado por):**
  - `apps/api/src/modules/marcas/` — logo da marca
  - `apps/api/src/modules/fornecedores/` — logo do fornecedor
  - `apps/api/src/modules/produtos/` — mídias do produto
  - `apps/api/src/modules/notas-fiscais/` — XML e PDF da nota
  - `apps/api/src/modules/configuracoes-empresa/` — logo da empresa

## Skills Relevantes

- `nestjs-erp-module` — estrutura de módulo, injeção de dependência, service provider
- `seguranca-lgpd` — credenciais em env vars, validação de MIME, URLs assinadas

## Agentes Relevantes

- `revisor-erp` — após qualquer alteração no StorageService
- `auditor-seguranca-lgpd` — verificar que credenciais não estão no código e MIME é validado server-side

## Critérios de Aceite

- [ ] Upload de imagem JPEG válida retorna `UploadResult` com `key`, `size`, `mime_type` e `etag`.
- [ ] Upload de arquivo com MIME detectado diferente do esperado retorna erro `422 Unprocessable Entity`.
- [ ] Upload de logo acima de 2 MB retorna `413 Payload Too Large`.
- [ ] `getSignedUrl` para arquivo de nota fiscal retorna URL com TTL máximo de 10 minutos.
- [ ] `getPublicUrl` para mídia de produto retorna URL pública via CDN (sem expiração).
- [ ] Tentativa de deletar arquivo em `StorageFolder.INVOICE_XML` lança exceção; arquivo permanece no bucket.
- [ ] Credenciais de storage não aparecem em nenhum arquivo versionado no repositório.
- [ ] Em ambiente de desenvolvimento com MinIO, todos os métodos do `StorageService` funcionam sem conta S3/R2.
- [ ] Key gerada pelo servidor: nenhum parâmetro de entrada do cliente define o path final no bucket.
