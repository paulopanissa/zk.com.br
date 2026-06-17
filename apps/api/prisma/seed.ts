import {
  BaseCalculo,
  CustomerFieldType,
  CustomerAuditAction,
  NfEntradaStatus,
  PaymentChannel,
  PaymentEnvironment,
  PaymentMethod,
  PaymentProviderSlug,
  PrismaClient,
  RegimeTributario,
  StockMovementType,
  TipoDocumento,
  TipoDocumentoSupplier,
  TipoEnderecoEmpresa,
  TipoEmailEmpresa,
  TipoImposto,
  TipoTelefoneEmpresa,
  TipoUnidade,
  TipoCusto,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// ─── PII helpers (mirrors CryptoService — no NestJS DI in seed context) ──────

const PII_KEY = process.env.PII_ENCRYPTION_KEY ?? '0'.repeat(64);
const PII_HASH_KEY = process.env.PII_HASH_KEY ?? 'dev-hash-key';

function encryptPii(value: string): string {
  const key = Buffer.from(PII_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function hashPii(value: string): string {
  return crypto.createHmac('sha256', PII_HASH_KEY).update(value.toLowerCase().trim()).digest('hex');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱  Seeding ZK database...');

  // ── 1. Company Settings ───────────────────────────────────────────────────
  const company = await prisma.companySettings.upsert({
    where: { cnpj_cpf: '12345678000195' },
    update: {},
    create: {
      razao_social: 'Petshop ZK Comércio de Animais Ltda',
      nome_fantasia: 'ZK Petshop',
      cnpj_cpf: '12345678000195',
      tipo_documento: TipoDocumento.CNPJ,
      inscricao_estadual: '123456789012',
      regime_tributario: RegimeTributario.SIMPLES,
      dpo_email: 'dpo@zkpetshop.com.br',
      emails: {
        create: [
          { tipo: TipoEmailEmpresa.COMERCIAL, email: 'contato@zkpetshop.com.br', principal: true },
          { tipo: TipoEmailEmpresa.NFE, email: 'nfe@zkpetshop.com.br', principal: false },
          { tipo: TipoEmailEmpresa.DPO, email: 'dpo@zkpetshop.com.br', principal: false },
        ],
      },
      phones: {
        create: [
          { tipo: TipoTelefoneEmpresa.COMERCIAL, numero: '1133334444', principal: true },
          { tipo: TipoTelefoneEmpresa.WHATSAPP, numero: '11999998888', principal: false },
        ],
      },
      addresses: {
        create: [
          {
            tipo: TipoEnderecoEmpresa.MATRIZ,
            logradouro: 'Rua dos Bichos',
            numero: '100',
            complemento: 'Sala 1',
            bairro: 'Jardim América',
            municipio: 'São Paulo',
            uf: 'SP',
            cep: '01310100',
            codigo_ibge: '3550308',
            principal: true,
          },
        ],
      },
    },
  });
  console.log('  ✓ Company Settings');

  // ── 2. Unit ───────────────────────────────────────────────────────────────
  const unit = await prisma.unit.upsert({
    where: { slug: 'zk-matriz-sp' },
    update: {},
    create: {
      company_settings_id: company.id,
      nome: 'ZK Petshop — Matriz São Paulo',
      slug: 'zk-matriz-sp',
      tipo: TipoUnidade.MATRIZ,
      cnpj_inscricao: '12345678000195',
      ativa: true,
      permite_venda_offline: true,
      address: {
        create: {
          logradouro: 'Rua dos Bichos',
          numero: '100',
          complemento: 'Sala 1',
          bairro: 'Jardim América',
          municipio: 'São Paulo',
          uf: 'SP',
          cep: '01310100',
          codigo_ibge: '3550308',
        },
      },
      config: {
        create: {
          estoque_proprio: true,
          caixa_proprio: true,
          timezone: 'America/Sao_Paulo',
        },
      },
    },
  });
  console.log('  ✓ Unit');

  // ── 3. System Users ───────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Zk@12345678', 10);

  const admin = await prisma.systemUser.upsert({
    where: { email: 'admin@zkpetshop.com.br' },
    update: {},
    create: {
      email: 'admin@zkpetshop.com.br',
      password_hash: passwordHash,
      name: 'Administrador ZK',
      role: 'ADMINISTRADOR',
      unidade_id: unit.id,
      is_active: true,
    },
  });

  await prisma.systemUser.upsert({
    where: { email: 'operador@zkpetshop.com.br' },
    update: {},
    create: {
      email: 'operador@zkpetshop.com.br',
      password_hash: passwordHash,
      name: 'Operador Estoque',
      role: 'OPERADOR_ESTOQUE_COMPRAS',
      unidade_id: unit.id,
      is_active: true,
    },
  });

  await prisma.systemUser.upsert({
    where: { email: 'pdv@zkpetshop.com.br' },
    update: {},
    create: {
      email: 'pdv@zkpetshop.com.br',
      password_hash: passwordHash,
      name: 'Operador PDV',
      role: 'OPERADOR_PDV',
      unidade_id: unit.id,
      is_active: true,
    },
  });

  await prisma.systemUser.upsert({
    where: { email: 'dpo@zkpetshop.com.br' },
    update: {},
    create: {
      email: 'dpo@zkpetshop.com.br',
      password_hash: passwordHash,
      name: 'DPO ZK',
      role: 'DPO',
      unidade_id: unit.id,
      is_active: true,
    },
  });
  console.log('  ✓ SystemUsers (admin / operador / pdv / dpo) — senha: Zk@12345678');

  // ── 4. Brands ─────────────────────────────────────────────────────────────
  const brandsData = [
    { name: 'Royal Canin', slug: 'royal-canin' },
    { name: 'Pedigree', slug: 'pedigree' },
    { name: 'Whiskas', slug: 'whiskas' },
    { name: 'Premier Pet', slug: 'premier-pet' },
    { name: 'Lavitan Pet', slug: 'lavitan-pet' },
  ];

  const brands: Record<string, string> = {};
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { unidade_id_slug: { unidade_id: unit.id, slug: b.slug } },
      update: {},
      create: { unidade_id: unit.id, name: b.name, slug: b.slug, active: true },
    });
    brands[b.slug] = brand.id;
  }
  console.log('  ✓ Brands (5)');

  // ── 5. Categories ─────────────────────────────────────────────────────────
  // Root categories (no parentId needed for upsert — Category has no unique slug constraint, but we upsert by name per unit)
  // Using raw create-if-not-exists via findFirst + create pattern (no unique slug index on category)
  async function upsertCategory(
    name: string,
    slug: string,
    parentId: string | null,
    sortOrder: number,
  ): Promise<string> {
    const existing = await prisma.category.findFirst({
      where: { unidade_id: unit.id, slug },
      select: { id: true },
    });
    if (existing) return existing.id;
    const cat = await prisma.category.create({
      data: {
        unidade_id: unit.id,
        parent_id: parentId,
        name,
        slug,
        sort_order: sortOrder,
        active: true,
      },
    });
    return cat.id;
  }

  const catAlimentacao = await upsertCategory('Alimentação', 'alimentacao', null, 1);
  const catRacaoSeca = await upsertCategory('Ração Seca', 'racao-seca', catAlimentacao, 1);
  const catRacaoUmida = await upsertCategory('Ração Úmida', 'racao-umida', catAlimentacao, 2);
  const catPetisco = await upsertCategory('Petiscos e Snacks', 'petiscos-snacks', catAlimentacao, 3);
  const catSaude = await upsertCategory('Saúde e Medicamentos', 'saude-medicamentos', null, 2);
  const catMedicamentos = await upsertCategory('Medicamentos', 'medicamentos', catSaude, 1);
  const catHigiene = await upsertCategory('Higiene e Beleza', 'higiene-beleza', null, 3);
  const catAcessorios = await upsertCategory('Acessórios', 'acessorios', null, 4);
  void catRacaoUmida, catPetisco, catMedicamentos, catHigiene, catAcessorios;
  console.log('  ✓ Categories (8)');

  // ── 6. Cost Center ────────────────────────────────────────────────────────
  const costCenter = await prisma.costCenter.upsert({
    where: { id: (await prisma.costCenter.findFirst({ where: { unidade_id: unit.id, nome: 'Operacional' }, select: { id: true } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: {
      unidade_id: unit.id,
      nome: 'Operacional',
      descricao: 'Custos operacionais da loja',
      ativo: true,
    },
  });

  // CostItems: use findFirst + create for idempotency
  async function upsertCostItem(nome: string, tipo: TipoCusto, valorCentavos?: number): Promise<void> {
    const existing = await prisma.costItem.findFirst({
      where: { unidade_id: unit.id, cost_center_id: costCenter.id, nome },
    });
    if (!existing) {
      await prisma.costItem.create({
        data: {
          cost_center_id: costCenter.id,
          unidade_id: unit.id,
          nome,
          tipo,
          valor_centavos: valorCentavos ?? null,
          ativo: true,
        },
      });
    }
  }
  await upsertCostItem('Aluguel', TipoCusto.FIXO, 500000);
  await upsertCostItem('Embalagens', TipoCusto.VARIAVEL, 150);
  await upsertCostItem('Energia Elétrica', TipoCusto.FIXO, 80000);
  console.log('  ✓ CostCenter + CostItems');

  // ── 7. Suppliers ──────────────────────────────────────────────────────────
  async function upsertSupplier(doc: string, razaoSocial: string, nomeFantasia: string, email: string): Promise<string> {
    const s = await prisma.supplier.upsert({
      where: { unidade_id_document: { unidade_id: unit.id, document: doc } },
      update: {},
      create: {
        unidade_id: unit.id,
        document: doc,
        document_type: TipoDocumentoSupplier.CNPJ,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        email,
        active: true,
      },
    });
    return s.id;
  }

  const supplierId1 = await upsertSupplier('11222333000181', 'PremiumPet Distribuição Ltda', 'PremiumPet', 'comercial@premiumpet.com.br');
  const supplierId2 = await upsertSupplier('11111111000191', 'Farmavet Indústria Farmacêutica Ltda', 'Farmavet', 'pedidos@farmavet.com.br');
  const supplierId3 = await upsertSupplier('98765432000155', 'PetImport Comércio Internacional Ltda', 'PetImport', 'importacao@petimport.com.br');
  void supplierId2, supplierId3;

  // Link suppliers to brands
  const sbExisting1 = await prisma.supplierBrand.findFirst({ where: { supplier_id: supplierId1, brand_id: brands['royal-canin'] } });
  if (!sbExisting1) await prisma.supplierBrand.create({ data: { supplier_id: supplierId1, brand_id: brands['royal-canin'] } });
  const sbExisting2 = await prisma.supplierBrand.findFirst({ where: { supplier_id: supplierId1, brand_id: brands['premier-pet'] } });
  if (!sbExisting2) await prisma.supplierBrand.create({ data: { supplier_id: supplierId1, brand_id: brands['premier-pet'] } });
  console.log('  ✓ Suppliers (3)');

  // ── 8. Tax Profile ────────────────────────────────────────────────────────
  const taxProfileExisting = await prisma.taxProfile.findFirst({ where: { nome: 'Simples Nacional — Pet Shop' } });
  const taxProfile = taxProfileExisting ?? await prisma.taxProfile.create({
    data: {
      nome: 'Simples Nacional — Pet Shop',
      regime_tributario: RegimeTributario.SIMPLES,
      descricao: 'Perfil fiscal padrão para produtos pet no Simples Nacional',
      ativo: true,
      padrao: true,
    },
  });

  async function upsertTaxRate(imposto: TipoImposto, aliquota: number, baseCalculo: BaseCalculo): Promise<void> {
    const existing = await prisma.taxRate.findFirst({ where: { profile_id: taxProfile.id, imposto } });
    if (!existing) {
      await prisma.taxRate.create({
        data: {
          profile_id: taxProfile.id,
          imposto,
          aliquota_percentual: aliquota,
          base_calculo: baseCalculo,
          incluso_no_preco: true,
        },
      });
    }
  }
  await upsertTaxRate(TipoImposto.ICMS, 1200, BaseCalculo.PRECO_VENDA);
  await upsertTaxRate(TipoImposto.PIS, 65, BaseCalculo.PRECO_VENDA);
  await upsertTaxRate(TipoImposto.COFINS, 300, BaseCalculo.PRECO_VENDA);

  // NCM overrides for pet food (NCM 2309.10.00)
  await prisma.ncmTaxOverride.upsert({
    where: { ncm_imposto: { ncm: '23091000', imposto: 'ICMS' } },
    update: {},
    create: { ncm: '23091000', imposto: 'ICMS', aliquota_percentual: 700, descricao: 'Alimento preparado para cães/gatos' },
  });
  console.log('  ✓ TaxProfile + TaxRates');

  // ── 9. Payment Provider ───────────────────────────────────────────────────
  const provider = await prisma.paymentProvider.upsert({
    where: { slug: PaymentProviderSlug.ASAAS },
    update: {},
    create: {
      slug: PaymentProviderSlug.ASAAS,
      nome_exibicao: 'Asaas',
      ativo: true,
    },
  });

  await prisma.paymentChannelConfig.upsert({
    where: { canal: PaymentChannel.PDV },
    update: {},
    create: {
      canal: PaymentChannel.PDV,
      provider_id: provider.id,
      ambiente: PaymentEnvironment.SANDBOX,
    },
  });

  await prisma.paymentChannelConfig.upsert({
    where: { canal: PaymentChannel.ECOMMERCE },
    update: {},
    create: {
      canal: PaymentChannel.ECOMMERCE,
      provider_id: provider.id,
      ambiente: PaymentEnvironment.SANDBOX,
    },
  });

  const methodMappings: Array<{ canal: PaymentChannel; metodo: PaymentMethod; taxa: number; taxaFixa: number }> = [
    { canal: PaymentChannel.PDV, metodo: PaymentMethod.DINHEIRO, taxa: 0, taxaFixa: 0 },
    { canal: PaymentChannel.PDV, metodo: PaymentMethod.PIX, taxa: 0, taxaFixa: 0 },
    { canal: PaymentChannel.PDV, metodo: PaymentMethod.CARTAO_DEBITO, taxa: 150, taxaFixa: 0 },
    { canal: PaymentChannel.PDV, metodo: PaymentMethod.CARTAO_CREDITO, taxa: 290, taxaFixa: 0 },
    { canal: PaymentChannel.PDV, metodo: PaymentMethod.MAQUININHA_POINT, taxa: 190, taxaFixa: 0 },
    { canal: PaymentChannel.ECOMMERCE, metodo: PaymentMethod.PIX, taxa: 0, taxaFixa: 0 },
    { canal: PaymentChannel.ECOMMERCE, metodo: PaymentMethod.CARTAO_CREDITO, taxa: 350, taxaFixa: 0 },
    { canal: PaymentChannel.ECOMMERCE, metodo: PaymentMethod.BOLETO, taxa: 0, taxaFixa: 350 },
  ];

  for (const m of methodMappings) {
    await prisma.paymentMethodMapping.upsert({
      where: { canal_metodo: { canal: m.canal, metodo: m.metodo } },
      update: {},
      create: {
        canal: m.canal,
        metodo: m.metodo,
        provider_id: provider.id,
        ativo: true,
        taxa_percentual: m.taxa,
        taxa_fixa_centavos: m.taxaFixa,
      },
    });
  }
  console.log('  ✓ PaymentProvider (Asaas sandbox) + channel configs + method mappings');

  // ── 10. Products ──────────────────────────────────────────────────────────
  interface ProductSeed {
    name: string;
    slug: string;
    sku: string;
    barcode: string;
    description: string;
    shortDescription: string;
    categoryId: string | null;
    brandSlug: string | null;
    unitMeasure: string;
    costCents: number;
    saleCents: number;
    weightGrams: number;
    ncm: string;
    csosn: string;
  }

  const productSeeds: ProductSeed[] = [
    {
      name: 'Royal Canin Mini Adult 2,5kg',
      slug: 'royal-canin-mini-adult-2-5kg',
      sku: 'RC-MINI-ADU-2500',
      barcode: '7896328606022',
      description: 'Ração seca para cães adultos de raças mini (até 10kg). Fórmula adaptada ao tamanho das crocantes.',
      shortDescription: 'Ração seca cães mini adulto 2,5kg',
      categoryId: catRacaoSeca,
      brandSlug: 'royal-canin',
      unitMeasure: 'UN',
      costCents: 7490,
      saleCents: 10990,
      weightGrams: 2500,
      ncm: '23091000',
      csosn: '400',
    },
    {
      name: 'Royal Canin Indoor Adult 1,5kg',
      slug: 'royal-canin-indoor-adult-1-5kg',
      sku: 'RC-IND-ADU-1500',
      barcode: '7896328607011',
      description: 'Ração seca para gatos adultos que vivem em ambientes internos. Reduz odor das fezes.',
      shortDescription: 'Ração seca gatos indoor adulto 1,5kg',
      categoryId: catRacaoSeca,
      brandSlug: 'royal-canin',
      unitMeasure: 'UN',
      costCents: 5990,
      saleCents: 8490,
      weightGrams: 1500,
      ncm: '23091000',
      csosn: '400',
    },
    {
      name: 'Premier Pet Frango e Arroz 15kg',
      slug: 'premier-pet-frango-arroz-15kg',
      sku: 'PP-FGA-15K',
      barcode: '7896220912301',
      description: 'Ração seca para cães adultos de todos os portes com frango e arroz. Alto digestibilidade.',
      shortDescription: 'Ração seca cães frango e arroz 15kg',
      categoryId: catRacaoSeca,
      brandSlug: 'premier-pet',
      unitMeasure: 'UN',
      costCents: 14990,
      saleCents: 22990,
      weightGrams: 15000,
      ncm: '23091000',
      csosn: '400',
    },
    {
      name: 'Pedigree Vital Pro Adulto 10,1kg',
      slug: 'pedigree-vital-pro-adulto-10-1kg',
      sku: 'PED-VP-ADU-10K',
      barcode: '7896088311224',
      description: 'Ração seca para cães adultos de todas as raças. Rico em vitaminas e minerais essenciais.',
      shortDescription: 'Ração seca cães adulto 10,1kg',
      categoryId: catRacaoSeca,
      brandSlug: 'pedigree',
      unitMeasure: 'UN',
      costCents: 8990,
      saleCents: 13490,
      weightGrams: 10100,
      ncm: '23091000',
      csosn: '400',
    },
    {
      name: 'Whiskas Carne ao Molho 85g (lata)',
      slug: 'whiskas-carne-ao-molho-85g',
      sku: 'WH-CARNE-85G',
      barcode: '7896088412201',
      description: 'Ração úmida para gatos adultos com pedaços de carne ao molho. Rico em taurina.',
      shortDescription: 'Ração úmida gatos carne ao molho 85g',
      categoryId: catRacaoUmida,
      brandSlug: 'whiskas',
      unitMeasure: 'UN',
      costCents: 259,
      saleCents: 449,
      weightGrams: 85,
      ncm: '23091000',
      csosn: '400',
    },
    {
      name: 'Pedigree Snack Dentastix Cães Médios 105g',
      slug: 'pedigree-dentastix-medios-105g',
      sku: 'PED-DENT-MED-105G',
      barcode: '7896088555601',
      description: 'Petisco dental para cães de porte médio (10–25kg). Reduz a formação de tártaro em até 80%.',
      shortDescription: 'Snack dental cães médios 105g',
      categoryId: catPetisco,
      brandSlug: 'pedigree',
      unitMeasure: 'UN',
      costCents: 1290,
      saleCents: 1990,
      weightGrams: 105,
      ncm: '23091000',
      csosn: '400',
    },
    {
      name: 'Lavitan Pet Suplemento Cães 60 comprimidos',
      slug: 'lavitan-pet-suplemento-caes-60cp',
      sku: 'LAV-SUP-CAE-60CP',
      barcode: '7892840900203',
      description: 'Suplemento vitamínico e mineral mastigável para cães. Apoia imunidade, pele e pelagem.',
      shortDescription: 'Suplemento vitamínico cães 60 comprimidos',
      categoryId: catMedicamentos,
      brandSlug: 'lavitan-pet',
      unitMeasure: 'UN',
      costCents: 2190,
      saleCents: 3490,
      weightGrams: 120,
      ncm: '30049099',
      csosn: '400',
    },
    // Products 8-10 will receive stock via NF CONFIRMADA
    {
      name: 'Royal Canin Maxi Adult 15kg',
      slug: 'royal-canin-maxi-adult-15kg',
      sku: 'RC-MAXI-ADU-15K',
      barcode: '7896328608055',
      description: 'Ração seca para cães adultos de raças grandes (26–44kg). Apoia saúde articular.',
      shortDescription: 'Ração seca cães maxi adulto 15kg',
      categoryId: catRacaoSeca,
      brandSlug: 'royal-canin',
      unitMeasure: 'UN',
      costCents: 24990,
      saleCents: 35990,
      weightGrams: 15000,
      ncm: '23091000',
      csosn: '400',
    },
    {
      name: 'Whiskas Frango ao Molho 85g (lata)',
      slug: 'whiskas-frango-ao-molho-85g',
      sku: 'WH-FRANGO-85G',
      barcode: '7896088412210',
      description: 'Ração úmida para gatos adultos com pedaços de frango ao molho. Rico em proteína.',
      shortDescription: 'Ração úmida gatos frango ao molho 85g',
      categoryId: catRacaoUmida,
      brandSlug: 'whiskas',
      unitMeasure: 'UN',
      costCents: 259,
      saleCents: 449,
      weightGrams: 85,
      ncm: '23091000',
      csosn: '400',
    },
    {
      name: 'Premier Pet Gatos Adulto Frango 1,5kg',
      slug: 'premier-pet-gatos-adulto-frango-1-5kg',
      sku: 'PP-GAT-FGA-1500',
      barcode: '7896220913101',
      description: 'Ração seca para gatos adultos com frango. Contém taurina e ômega 3 e 6.',
      shortDescription: 'Ração seca gatos adulto frango 1,5kg',
      categoryId: catRacaoSeca,
      brandSlug: 'premier-pet',
      unitMeasure: 'UN',
      costCents: 4490,
      saleCents: 6990,
      weightGrams: 1500,
      ncm: '23091000',
      csosn: '400',
    },
  ];

  const productIds: string[] = [];

  for (const p of productSeeds) {
    const existing = await prisma.product.findFirst({
      where: { unidade_id: unit.id, slug: p.slug },
      select: { id: true },
    });

    let productId: string;
    if (existing) {
      productId = existing.id;
    } else {
      const margin = Math.round(((p.saleCents - p.costCents) / p.saleCents) * 10000);
      const marginCents = p.saleCents - p.costCents;

      const product = await prisma.product.create({
        data: {
          unidade_id: unit.id,
          category_id: p.categoryId,
          brand_id: p.brandSlug ? brands[p.brandSlug] : null,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          barcode: p.barcode,
          description: p.description,
          short_description: p.shortDescription,
          unit: p.unitMeasure,
          active: true,
          featured: false,
          min_stock: 5,
          pricing: {
            create: {
              cost_price_cents: p.costCents,
              sale_price_cents: p.saleCents,
              discount_enabled: true,
              max_discount_pct: new Decimal('10.00'),
              margin_pct: new Decimal((margin / 100).toFixed(4)),
              margin_cents: marginCents,
            },
          },
          fiscal: {
            create: {
              ncm: p.ncm,
              cfop: '5405',
              origem: 0,
              csosn: p.csosn,
              cst_pis: '07',
              cst_cofins: '07',
              aliquota_icms: new Decimal('12.00'),
              aliquota_pis: new Decimal('0.65'),
              aliquota_cofins: new Decimal('3.00'),
            },
          },
          seo: {
            create: {
              seo_title: p.name.slice(0, 70),
              seo_description: p.shortDescription,
              seo_keywords: p.name.toLowerCase().split(' ').filter((w) => w.length > 3),
            },
          },
          delivery: {
            create: {
              weight_grams: p.weightGrams,
              free_shipping: p.weightGrams > 5000,
              ships_from_store: true,
            },
          },
        },
      });
      productId = product.id;
    }
    productIds.push(productId);
  }
  console.log('  ✓ Products (10)');

  // ── 11. Lots + StockMovements (initial stock for products 0-6) ────────────
  const lotsForManualEntry = [
    { idx: 0, code: 'L2025-RC-001', qty: 30, expires: '2026-12-31', mfg: '2025-01-15' },
    { idx: 1, code: 'L2025-RC-002', qty: 50, expires: '2026-10-31', mfg: '2025-02-10' },
    { idx: 2, code: 'L2025-PP-001', qty: 20, expires: '2026-09-30', mfg: '2025-03-01' },
    { idx: 3, code: 'L2025-PED-001', qty: 25, expires: '2026-11-30', mfg: '2025-01-20' },
    { idx: 4, code: 'L2025-WH-001', qty: 200, expires: '2027-06-30', mfg: '2025-04-01' },
    { idx: 5, code: 'L2025-DENT-001', qty: 100, expires: '2027-03-31', mfg: '2025-02-28' },
    { idx: 6, code: 'L2025-LAV-001', qty: 60, expires: '2027-01-31', mfg: '2025-03-15' },
  ];

  const manualLotIds: string[] = [];

  for (const l of lotsForManualEntry) {
    const productId = productIds[l.idx];
    const existingLot = await prisma.lot.findFirst({
      where: { unidade_id: unit.id, product_id: productId, code: l.code },
      select: { id: true },
    });

    let lotId: string;
    if (existingLot) {
      lotId = existingLot.id;
    } else {
      const lot = await prisma.lot.create({
        data: {
          unidade_id: unit.id,
          product_id: productId,
          code: l.code,
          quantity_received: new Decimal(l.qty),
          expires_at: new Date(l.expires),
          manufactured_at: new Date(l.mfg),
          tags: [],
          active: true,
        },
      });
      lotId = lot.id;
    }
    manualLotIds.push(lotId);

    // StockMovement: idempotent via idempotency_key
    await prisma.stockMovement.upsert({
      where: { idempotency_key: `seed-manual-entry-${l.code}` },
      update: {},
      create: {
        unidade_id: unit.id,
        product_id: productId,
        lot_id: lotId,
        type: StockMovementType.MANUAL_ENTRY,
        quantity: new Decimal(l.qty),
        reference_type: 'seed',
        idempotency_key: `seed-manual-entry-${l.code}`,
        notes: 'Estoque inicial — seed de desenvolvimento',
        created_by: admin.id,
      },
    });
  }
  void manualLotIds;
  console.log('  ✓ Lots (7) + StockMovements — estoque inicial manual');

  // ── 12. CustomerFieldDefinitions ──────────────────────────────────────────
  async function upsertFieldDef(nomeCampo: string, label: string, tipo: CustomerFieldType, ordem: number, opcoes?: unknown): Promise<void> {
    const existing = await prisma.customerFieldDefinition.findFirst({
      where: { unidade_id: unit.id, nome_campo: nomeCampo },
    });
    if (!existing) {
      await prisma.customerFieldDefinition.create({
        data: {
          unidade_id: unit.id,
          nome_campo: nomeCampo,
          label,
          tipo,
          obrigatorio: false,
          opcoes: opcoes ? JSON.parse(JSON.stringify(opcoes)) : undefined,
          ordem,
          ativo: true,
        },
      });
    }
  }

  await upsertFieldDef('especie_animal', 'Espécie do Animal', CustomerFieldType.SELECT, 1, {
    options: ['Cão', 'Gato', 'Pássaro', 'Peixe', 'Roedor', 'Réptil', 'Outro'],
  });
  await upsertFieldDef('raca_animal', 'Raça do Animal', CustomerFieldType.TEXT, 2);
  await upsertFieldDef('nome_animal', 'Nome do Pet', CustomerFieldType.TEXT, 3);
  await upsertFieldDef('clube_fidelidade', 'Participa do Clube de Fidelidade', CustomerFieldType.BOOLEAN, 4);
  console.log('  ✓ CustomerFieldDefinitions (4)');

  // ── 13. Customers ─────────────────────────────────────────────────────────
  interface CustomerSeed {
    nome: string;
    telefone: string;
    email: string;
    cpf: string;
    dataNascimento: string;
  }

  const customerSeeds: CustomerSeed[] = [
    { nome: 'Maria Silva Santos', telefone: '11988887777', email: 'maria.silva@email.com', cpf: '12345678909', dataNascimento: '1985-03-15' },
    { nome: 'João Pedro Oliveira', telefone: '11977776666', email: 'joao.pedro@email.com', cpf: '98765432100', dataNascimento: '1990-07-22' },
    { nome: 'Ana Carolina Souza', telefone: '11966665555', email: 'ana.carolina@email.com', cpf: '45678912300', dataNascimento: '1978-11-05' },
  ];

  for (const c of customerSeeds) {
    const cpfHash = hashPii(c.cpf);
    const existing = await prisma.customer.findFirst({
      where: { unidade_id: unit.id, cpf_cnpj_hash: cpfHash },
      select: { id: true },
    });

    if (!existing) {
      const customer = await prisma.customer.create({
        data: {
          unidade_id: unit.id,
          nome: c.nome,
          telefone_principal: c.telefone,
          email: c.email,
          cpf_cnpj_enc: encryptPii(c.cpf),
          cpf_cnpj_hash: cpfHash,
          data_nascimento_enc: encryptPii(c.dataNascimento),
          dados_dinamicos: {
            especie_animal: 'Cão',
            raca_animal: 'Sem Raça Definida',
            nome_animal: 'Totó',
            clube_fidelidade: true,
          },
          consentimento_lgpd: true,
          consentimento_versao: '1.0',
          consentimento_em: new Date('2025-01-01T00:00:00Z'),
          ativo: true,
        },
      });

      await prisma.customerAuditLog.create({
        data: {
          customer_id: customer.id,
          acao: CustomerAuditAction.CRIACAO,
          usuario_id: admin.id,
          ip_origem: '127.0.0.1',
          detalhe: 'Cliente criado via seed de desenvolvimento',
        },
      });
    }
  }
  console.log('  ✓ Customers (3) — CPF/nascimento criptografados');

  // ── 14. NF Entrada ────────────────────────────────────────────────────────

  // 14a. NF RASCUNHO (3 itens: 2 vinculados, 1 pendente de vinculação)
  const nfRascunhoChave = '35250112345678000195550010000000011234567895';
  const nfRascunhoExisting = await prisma.nfEntrada.findFirst({
    where: { unidade_id: unit.id, chave_acesso: nfRascunhoChave },
  });

  if (!nfRascunhoExisting) {
    await prisma.nfEntrada.create({
      data: {
        unidade_id: unit.id,
        fornecedor_id: supplierId1,
        numero: '000001',
        serie: '1',
        chave_acesso: nfRascunhoChave,
        data_emissao: new Date('2026-06-01'),
        data_entrada: new Date('2026-06-02'),
        valor_total: 450000,
        status: NfEntradaStatus.RASCUNHO,
        created_by: admin.id,
        observacao: 'NF de rascunho para revisão — itens pendentes de vinculação com produto',
        items: {
          create: [
            {
              numero_item: 1,
              codigo_produto: 'RC-MINI-ADU-2500',
              ean: '7896328606022',
              descricao: 'ROYAL CANIN MINI ADULT 2,5KG',
              ncm: '23091000',
              cfop: '1102',
              unidade_medida: 'UN',
              quantidade: new Decimal('30'),
              valor_unitario: 7490,
              valor_total: 224700,
              lote_numero: 'L2026-RC-NOVO',
              data_validade: new Date('2027-06-30'),
              data_fabricacao: new Date('2025-12-01'),
              product_id: productIds[0],
              brand_id: brands['royal-canin'],
            },
            {
              numero_item: 2,
              codigo_produto: 'PP-FGA-15K',
              ean: '7896220912301',
              descricao: 'PREMIER PET FRANGO E ARROZ 15KG',
              ncm: '23091000',
              cfop: '1102',
              unidade_medida: 'UN',
              quantidade: new Decimal('10'),
              valor_unitario: 14990,
              valor_total: 149900,
              lote_numero: null,
              data_validade: new Date('2027-03-31'),
              data_fabricacao: new Date('2026-01-10'),
              product_id: productIds[2],
              brand_id: brands['premier-pet'],
            },
            {
              numero_item: 3,
              codigo_produto: 'NOVO-PROD-001',
              ean: null,
              descricao: 'PRODUTO NOVO SEM CADASTRO — PENDENTE VINCULAÇÃO',
              ncm: '23091000',
              cfop: '1102',
              unidade_medida: 'UN',
              quantidade: new Decimal('50'),
              valor_unitario: 1500,
              valor_total: 75000,
              lote_numero: null,
              data_validade: null,
              data_fabricacao: null,
              product_id: null, // ← não vinculado — impede confirmação
              brand_id: null,
            },
          ],
        },
      },
    });
  }
  console.log('  ✓ NF RASCUNHO #000001 (2 itens vinculados, 1 pendente)');

  // 14b. NF CONFIRMADA (3 itens — produtos 7, 8, 9 — com lotes e movimentações)
  const nfConfirmadaChave = '35250212345678000195550010000000021234567902';
  const nfConfirmadaExisting = await prisma.nfEntrada.findFirst({
    where: { unidade_id: unit.id, chave_acesso: nfConfirmadaChave },
  });

  if (!nfConfirmadaExisting) {
    // Produtos 7=idx RC Maxi, 8=idx Whiskas Frango, 9=idx Premier Gatos
    const nfItems = [
      {
        idx: 7,
        sku: 'RC-MAXI-ADU-15K',
        ean: '7896328608055',
        descricao: 'ROYAL CANIN MAXI ADULT 15KG',
        qty: 15,
        valorUnit: 24990,
        lote: 'NF00002-I1',
        validade: '2027-09-30',
        fabricacao: '2026-02-01',
        brandSlug: 'royal-canin',
      },
      {
        idx: 8,
        sku: 'WH-FRANGO-85G',
        ean: '7896088412210',
        descricao: 'WHISKAS FRANGO AO MOLHO 85G',
        qty: 240,
        valorUnit: 259,
        lote: 'NF00002-I2',
        validade: '2028-01-31',
        fabricacao: '2026-03-01',
        brandSlug: 'whiskas',
      },
      {
        idx: 9,
        sku: 'PP-GAT-FGA-1500',
        ean: '7896220913101',
        descricao: 'PREMIER PET GATOS ADULTO FRANGO 1,5KG',
        qty: 40,
        valorUnit: 4490,
        lote: 'NF00002-I3',
        validade: '2027-08-31',
        fabricacao: '2026-01-15',
        brandSlug: 'premier-pet',
      },
    ];

    const nfValorTotal = nfItems.reduce((s, i) => s + i.valorUnit * i.qty, 0);

    const nfConfirmada = await prisma.nfEntrada.create({
      data: {
        unidade_id: unit.id,
        fornecedor_id: supplierId1,
        numero: '000002',
        serie: '1',
        chave_acesso: nfConfirmadaChave,
        data_emissao: new Date('2026-05-15'),
        data_entrada: new Date('2026-05-16'),
        valor_total: nfValorTotal,
        status: NfEntradaStatus.CONFIRMADA,
        created_by: admin.id,
        items: {
          createMany: {
            data: nfItems.map((i, order) => ({
              numero_item: order + 1,
              codigo_produto: i.sku,
              ean: i.ean,
              descricao: i.descricao,
              ncm: '23091000',
              cfop: '1102',
              unidade_medida: 'UN',
              quantidade: new Decimal(i.qty),
              valor_unitario: i.valorUnit,
              valor_total: i.valorUnit * i.qty,
              lote_numero: i.lote,
              data_validade: new Date(i.validade),
              data_fabricacao: new Date(i.fabricacao),
              product_id: productIds[i.idx],
              brand_id: brands[i.brandSlug],
            })),
          },
        },
      },
      include: { items: true },
    });

    // Create lots and stock movements for each confirmed item
    for (const item of nfConfirmada.items) {
      const lot = await prisma.lot.upsert({
        where: {
          unidade_id_product_id_code: {
            unidade_id: unit.id,
            product_id: item.product_id!,
            code: item.lote_numero!,
          },
        },
        update: {},
        create: {
          unidade_id: unit.id,
          product_id: item.product_id!,
          invoice_item_id: item.id,
          code: item.lote_numero!,
          quantity_received: item.quantidade,
          expires_at: item.data_validade,
          manufactured_at: item.data_fabricacao,
          tags: [],
          active: true,
        },
      });

      await prisma.stockMovement.upsert({
        where: { idempotency_key: `nf-confirm-${item.id}` },
        update: {},
        create: {
          unidade_id: unit.id,
          product_id: item.product_id!,
          lot_id: lot.id,
          type: StockMovementType.PURCHASE_ENTRY,
          quantity: item.quantidade,
          reference_id: item.id,
          reference_type: 'invoice_item',
          idempotency_key: `nf-confirm-${item.id}`,
          notes: `NF 000002 - Item ${item.numero_item}`,
          created_by: admin.id,
        },
      });
    }
  }
  console.log('  ✓ NF CONFIRMADA #000002 (3 itens — lotes + movimentações de estoque criados)');

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed concluído com sucesso!\n');
  console.log('  Usuários criados:');
  console.log('    admin@zkpetshop.com.br      (ADMINISTRADOR)');
  console.log('    operador@zkpetshop.com.br   (OPERADOR_ESTOQUE_COMPRAS)');
  console.log('    pdv@zkpetshop.com.br        (OPERADOR_PDV)');
  console.log('    dpo@zkpetshop.com.br        (DPO)');
  console.log('    Senha de todos: Zk@12345678');
  console.log('\n  Para rodar:');
  console.log('    pnpm --filter @zk/api prisma:seed\n');
}

main()
  .catch((e) => {
    console.error('❌  Seed falhou:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
