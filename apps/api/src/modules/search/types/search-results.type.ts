export interface ProductResult {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  active: boolean;
}

export interface CustomerResult {
  id: string;
  nome: string;
  email: string | null;
  ativo: boolean;
}

export interface SupplierResult {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  active: boolean;
}

export interface CategoryResult {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface BrandResult {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface SearchResults {
  q: string;
  took_ms: number;
  results: {
    products?: ProductResult[];
    customers?: CustomerResult[];
    suppliers?: SupplierResult[];
    categories?: CategoryResult[];
    brands?: BrandResult[];
  };
}
