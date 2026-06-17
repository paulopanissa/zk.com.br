---
name: seo-ecommerce
description: Convenções de SEO técnico e de conteúdo para o e-commerce deste projeto — Schema.org com JSON-LD, meta tags, Core Web Vitals, estrutura de URL, sitemap, robots.txt, paginação, e padrões por tipo de página (produto, categoria, home, busca). Use SEMPRE que trabalhar em qualquer página, componente, endpoint ou dado do e-commerce que possa afetar indexação ou ranqueamento no Google.
---

# SEO E-commerce

SEO é requisito de negócio, não enfeite. Todo componente, rota e dado do e-commerce deve ser construído com indexação e ranqueamento em mente desde o primeiro commit.

---

## Stack de referência

- **Frontend:** React com SSR/SSG (Next.js ou Remix) — nenhuma página de produto, categoria ou home pode ser client-only.
- **API:** NestJS fornece os dados; campos SEO (título, descrição, meta, slug) são responsabilidade da API — nunca chumbados no frontend.
- **Renderização:** Google indexa JavaScript, mas prefere HTML pré-renderizado. SSG para páginas estáticas, SSR para páginas dinâmicas com dados frequentemente atualizados.

---

## Schema.org com JSON-LD — obrigatório em todo e-commerce

Use **JSON-LD** em `<script type="application/ld+json">` no `<head>`. Nunca Microdata nem RDFa.  
Valide em: https://validator.schema.org e https://search.google.com/test/rich-results

### Tipos de schema por página

#### Página de Produto

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Nome do Produto",
  "description": "Descrição detalhada do produto",
  "image": ["https://exemplo.com/img/produto-1.webp", "https://exemplo.com/img/produto-2.webp"],
  "sku": "SKU-001",
  "mpn": "MPN-001",
  "brand": {
    "@type": "Brand",
    "name": "Nome da Marca"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://exemplo.com/produtos/slug-do-produto",
    "priceCurrency": "BRL",
    "price": "49.90",
    "priceValidUntil": "2025-12-31",
    "itemCondition": "https://schema.org/NewCondition",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Nome da Loja"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "127"
  },
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Cliente" },
      "reviewRating": { "@type": "Rating", "ratingValue": "5" },
      "reviewBody": "Ótimo produto!"
    }
  ]
}
```

> `price` deve ser string com ponto decimal (não vírgula). `priceValidUntil` é obrigatório para rich results de preço. Quando produto está em promoção, inclua `"priceValidUntil"` com a data fim.

#### Produto com variações (cores, tamanhos)

Cada variação é um `ProductGroup` com `hasVariant`:

```json
{
  "@context": "https://schema.org",
  "@type": "ProductGroup",
  "name": "Ração Premium",
  "description": "...",
  "productGroupID": "RAC-001",
  "variesBy": ["https://schema.org/size"],
  "hasVariant": [
    {
      "@type": "Product",
      "name": "Ração Premium 1kg",
      "sku": "RAC-001-1KG",
      "offers": { "@type": "Offer", "price": "29.90", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" }
    },
    {
      "@type": "Product",
      "name": "Ração Premium 5kg",
      "sku": "RAC-001-5KG",
      "offers": { "@type": "Offer", "price": "89.90", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" }
    }
  ]
}
```

#### BreadcrumbList — obrigatório em produto e categoria

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://exemplo.com" },
    { "@type": "ListItem", "position": 2, "name": "Rações", "item": "https://exemplo.com/racoes" },
    { "@type": "ListItem", "position": 3, "name": "Ração Premium", "item": "https://exemplo.com/racoes/racao-premium" }
  ]
}
```

#### Home — Organization + WebSite (SearchAction)

```json
[
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Nome da Loja",
    "url": "https://exemplo.com",
    "logo": "https://exemplo.com/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+55-11-99999-9999",
      "contactType": "customer service",
      "availableLanguage": "Portuguese"
    },
    "sameAs": [
      "https://www.instagram.com/nomeda_loja",
      "https://www.facebook.com/nomeda_loja"
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Nome da Loja",
    "url": "https://exemplo.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://exemplo.com/busca?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }
]
```

#### Página de categoria / listagem — ItemList

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Rações para Cães",
  "description": "As melhores rações para cães das marcas líderes",
  "numberOfItems": 48,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://exemplo.com/racoes/racao-premium-1kg"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "url": "https://exemplo.com/racoes/racao-standard-5kg"
    }
  ]
}
```

#### FAQ — use em produtos e categorias quando houver perguntas

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Qual a composição desta ração?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Frango, arroz integral, vitaminas A, D, E..."
      }
    }
  ]
}
```

#### LocalBusiness — se a loja tiver endereço físico

```json
{
  "@context": "https://schema.org",
  "@type": "PetStore",
  "name": "Nome da Loja",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rua Exemplo, 123",
    "addressLocality": "São Paulo",
    "addressRegion": "SP",
    "postalCode": "01310-100",
    "addressCountry": "BR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "09:00",
      "closes": "18:00"
    }
  ]
}
```

---

## Meta tags — padrão obrigatório

Cada página deve ter **title único, description única, canonical, og: e twitter:**.

```html
<!-- Primário -->
<title>Nome do Produto | Nome da Loja</title>
<meta name="description" content="Descrição de 150–160 caracteres, com palavra-chave principal no início." />
<link rel="canonical" href="https://exemplo.com/produtos/slug-do-produto" />

<!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
<meta property="og:type" content="product" />
<meta property="og:title" content="Nome do Produto | Nome da Loja" />
<meta property="og:description" content="Mesma descrição ou variação." />
<meta property="og:image" content="https://exemplo.com/img/produto-og.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://exemplo.com/produtos/slug-do-produto" />
<meta property="og:site_name" content="Nome da Loja" />
<meta property="product:price:amount" content="49.90" />
<meta property="product:price:currency" content="BRL" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Nome do Produto | Nome da Loja" />
<meta name="twitter:description" content="Descrição." />
<meta name="twitter:image" content="https://exemplo.com/img/produto-og.jpg" />
```

### Regras de title

| Tipo de página | Fórmula | Máx caracteres |
|---|---|---|
| Produto | `[Produto] - [Marca] \| [Loja]` | 60 |
| Categoria | `[Categoria] - [Benefício] \| [Loja]` | 60 |
| Home | `[Loja] - [Proposta de valor]` | 60 |
| Busca | `Busca: [termo] \| [Loja]` — **noindex** | — |

### Regras de description

- 150–160 caracteres.
- Palavra-chave principal nos primeiros 20 caracteres.
- CTA no final ("Compre agora", "Frete grátis").
- Nunca duplicar entre páginas.

### Pages que devem receber `noindex`

- Páginas de busca: `?q=termo`
- Filtros facetados que geram URLs únicas por combinação (ex: `?cor=preto&tamanho=M`)
- Páginas de carrinho, checkout, conta do usuário
- Páginas de agradecimento pós-compra
- Paginação além da página 2 (avalie caso a caso)

```html
<meta name="robots" content="noindex, follow" />
```

---

## Estrutura de URL

- Kebab-case, sem underscores: `/racoes-para-caes/racao-premium-5kg`
- Sem parâmetros desnecessários na URL canônica
- Máx 3 níveis de profundidade: `/categoria/subcategoria/produto`
- Slug derivado do nome do produto/categoria — gerado e armazenado na API (campo `slug` no banco), nunca no frontend
- Slugs são imutáveis depois de indexados; redirecione 301 se mudar

---

## Core Web Vitals — metas obrigatórias

| Métrica | Meta "Bom" | Como atingir |
|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | Pré-load da imagem hero, server-side render, CDN, `fetchpriority="high"` na imagem principal |
| **INP** (Interaction to Next Paint) | < 200ms | Evitar bloqueio de main thread, deferir JS não-crítico, web workers para operações pesadas |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Sempre definir `width` e `height` em imagens, reservar espaço para banners/ads, evitar inserção dinâmica de conteúdo acima do fold |

### Imagens — regras

- **Formato:** WebP com fallback JPEG/PNG (use `<picture>`).
- **Dimensões:** sempre `width` e `height` no HTML/CSS para evitar CLS.
- **Lazy loading:** `loading="lazy"` em imagens abaixo do fold; imagem principal do produto **não** pode ter lazy loading.
- **Priority hint:** `fetchpriority="high"` na imagem LCP (primeira foto do produto, banner da home).
- **Alt:** descritivo e com palavra-chave natural. Nunca vazio em imagens de produto.
- **Compressão:** < 200KB para imagens de produto em 800×800px.
- **CDN:** todas as imagens servidas via CDN (S3/R2 com CDN na frente).

---

## Sitemap e robots.txt

### sitemap.xml

- Gerado dinamicamente pela API ou no build.
- Inclua: home, categorias, produtos ativos com estoque > 0, páginas institucionais.
- Exclua: páginas noindex, busca, checkout, conta.
- Formato: `<loc>`, `<lastmod>` (ISO 8601), `<changefreq>`, `<priority>`.
- Submeta ao Google Search Console.
- Para lojas com > 50.000 URLs, use sitemap index.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://exemplo.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### robots.txt

```
User-agent: *
Disallow: /checkout/
Disallow: /minha-conta/
Disallow: /carrinho/
Disallow: /busca?
Disallow: /api/
Allow: /

Sitemap: https://exemplo.com/sitemap.xml
```

---

## Paginação e navegação facetada

### Paginação padrão (`/categoria?page=2`)

- Página 1 = canônica.
- Páginas 2+ podem ser indexadas **se** tiverem conteúdo relevante e único.
- Use `rel="next"` e `rel="prev"` (ainda úteis para Googlebot, mesmo que depreciados pelo Google).
- Alternativa: canonical em todas as páginas paginadas apontando para página 1 (perde ranqueamento de páginas internas).

### Faceted navigation (`/racoes?marca=royal-canin&peso=5kg`)

Estratégias (escolha uma por tipo de filtro):

| Caso | Estratégia |
|---|---|
| Filtro com alto volume de busca (ex: `/racoes-royal-canin`) | URL limpa + indexável + meta tags específicas |
| Filtro de baixo volume ou combinações | `noindex` + `canonical` para a categoria raiz |
| Filtros de ordenação (`?sort=preco`) | Sempre `noindex` |

---

## Heading hierarchy — obrigatório

- **Uma H1 por página** — nome do produto ou categoria exato.
- H2 para seções da página (Descrição, Especificações, Avaliações).
- H3 para subseções.
- Nunca pule níveis (H1 → H3 sem H2).
- H1 deve conter a palavra-chave principal da página.

---

## Conteúdo — requisitos de produto e categoria

### Produto

- Descrição mínima: 150 palavras originais (não copie do fornecedor).
- Inclua palavra-chave principal e variações semânticas nos primeiros 100 caracteres.
- Especificações técnicas em tabela (`<table>` semântica).
- Avaliações de clientes indexáveis (não carregar via JS puro).

### Categoria

- Texto introdutório de 80–200 palavras no topo da página com palavra-chave principal.
- Título H1 = nome da categoria + qualificador ("Rações para Cães - As Melhores Marcas").
- Breadcrumb visível e semanticamente correto.

---

## Links internos

- Produtos relacionados linkados semanticamente (não só por algoritmo).
- Breadcrumb em todas as páginas de produto e categoria.
- Link da home para as principais categorias.
- Ancla text descritivo — nunca "clique aqui" ou "saiba mais".
- Profundidade máxima de 3 cliques da home para qualquer produto.

---

## Dados vindos da API — campos obrigatórios

O backend deve expor e armazenar os seguintes campos para cada entidade do e-commerce:

### Produto

| Campo | Tipo | Descrição |
|---|---|---|
| `slug` | string | URL-friendly, único, imutável após criação |
| `metaTitle` | string | Título SEO (60 char max) |
| `metaDescription` | string | Description (160 char max) |
| `canonicalUrl` | string | URL canônica completa |
| `structuredData` | json | JSON-LD pré-gerado ou dados para gerar no frontend |
| `images[].alt` | string | Alt text de cada imagem |
| `noindex` | boolean | Override para noindex (ex: produto descontinuado) |

### Categoria

| Campo | Tipo | Descrição |
|---|---|---|
| `slug` | string | URL-friendly, único |
| `metaTitle` | string | Título SEO |
| `metaDescription` | string | Description |
| `seoText` | string | Texto SEO da categoria (exibido no topo ou rodapé) |
| `canonicalUrl` | string | URL canônica |

---

## Checklist por tipo de página

### Produto ✅

- [ ] Title único com nome do produto + marca + loja (≤ 60 chars)
- [ ] Meta description com palavra-chave e CTA (≤ 160 chars)
- [ ] Canonical apontando para a URL limpa do produto
- [ ] H1 = nome exato do produto
- [ ] Schema.org `Product` com `Offer`, `AggregateRating` e `BreadcrumbList`
- [ ] Open Graph completo com imagem 1200×630
- [ ] Imagem principal com `fetchpriority="high"`, sem `loading="lazy"`
- [ ] Todas as imagens com `width`, `height` e `alt` definidos
- [ ] Texto de descrição ≥ 150 palavras
- [ ] Produto disponível no sitemap.xml
- [ ] URL com slug semântico em kebab-case

### Categoria ✅

- [ ] Title com nome da categoria + qualificador + loja
- [ ] Meta description descritiva (não genérica)
- [ ] Canonical na página 1; `rel="next"` nas paginadas
- [ ] H1 = nome da categoria
- [ ] Schema.org `ItemList` + `BreadcrumbList`
- [ ] Texto SEO de 80–200 palavras
- [ ] Filtros facetados: noindex ou URL limpa conforme estratégia
- [ ] Categoria no sitemap.xml

### Home ✅

- [ ] Title com proposta de valor da loja (≤ 60 chars)
- [ ] Schema.org `Organization` + `WebSite` com `SearchAction`
- [ ] `LocalBusiness` se houver loja física
- [ ] Imagem hero com `fetchpriority="high"` e alt descritivo
- [ ] Links para principais categorias visíveis no HTML (não só JS)

---

## Ferramentas de validação

| Ferramenta | URL | Uso |
|---|---|---|
| Rich Results Test | https://search.google.com/test/rich-results | Validar JSON-LD |
| Schema Validator | https://validator.schema.org | Validar schema genérico |
| PageSpeed Insights | https://pagespeed.web.dev | Core Web Vitals |
| Search Console | https://search.google.com/search-console | Indexação, erros, performance |
| Mobile-Friendly Test | https://search.google.com/test/mobile-friendly | Compatibilidade mobile |

---

## Agentes relacionados

- `seo-ecommerce` — audita e orienta implementações de SEO no e-commerce.
