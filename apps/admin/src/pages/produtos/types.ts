export interface ProductPricing {
  cost_price_cents: number
  sale_price_cents: number
  promotional_price_cents: number | null
  promotional_starts_at: string | null
  promotional_ends_at: string | null
  discount_enabled: boolean
  max_discount_pct: number | null
  margin_pct: string | null
}

export interface ProductDelivery {
  weight_grams: number | null
  height_cm: number | null
  width_cm: number | null
  depth_cm: number | null
  free_shipping: boolean
  ships_from_store: boolean
}

export interface ProductFiscal {
  ncm: string | null
  cfop: string | null
  cest: string | null
  origem: number | null
  cst_icms: string | null
  csosn: string | null
  cst_pis: string | null
  cst_cofins: string | null
  cst_ipi: string | null
  aliquota_icms: number | null
  aliquota_pis: number | null
  aliquota_cofins: number | null
  aliquota_ipi: number | null
}

export interface ProductSeo {
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[]
  schema_org_json: object | null
}

export interface ProductMedia {
  id: string
  url: string
  sort_order: number
}

export interface ProductCategory {
  id: string
  name: string
  slug: string
}

export interface ProductBrand {
  id: string
  name: string
  slug: string
}

export interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  unit: string | null
  description: string | null
  short_description: string | null
  active: boolean
  featured: boolean
  min_stock: number
  pricing: ProductPricing | null
  delivery: ProductDelivery | null
  fiscal: ProductFiscal | null
  seo: ProductSeo | null
  category: ProductCategory | null
  brand: ProductBrand | null
  media: ProductMedia[]
  created_at: string
  updated_at: string
}

export interface ProductListResponse {
  data: Product[]
  total: number
  page: number
  limit: number
}

export function calcMargem(pricing: ProductPricing | null): number {
  if (!pricing || pricing.sale_price_cents === 0) return 0
  return ((pricing.sale_price_cents - pricing.cost_price_cents) / pricing.sale_price_cents) * 100
}
