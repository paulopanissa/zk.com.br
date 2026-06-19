export interface ProductPricing {
  cost_price_cents: number
  sale_price_cents: number
  promotional_price_cents: number | null
  margin_pct: string | null
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
  active: boolean
  featured: boolean
  min_stock: number
  pricing: ProductPricing | null
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
