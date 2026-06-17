import { Injectable } from '@nestjs/common';
import { Prisma, Supplier, SupplierAddress, SupplierContact } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type SupplierFull = Supplier & {
  addresses: SupplierAddress[];
  contacts: SupplierContact[];
  brands: { brand: { id: string; name: string; slug: string } }[];
};

export interface SupplierPage {
  data: SupplierFull[];
  total: number;
  page: number;
  limit: number;
}

const fullInclude = {
  addresses: true,
  contacts: true,
  brands: {
    include: {
      brand: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
} as const;

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    unitId: string,
    filters: {
      razao_social?: string;
      document?: string;
      active?: boolean;
      brand_id?: string;
    },
    pagination: { page: number; limit: number },
  ): Promise<SupplierPage> {
    const where: Prisma.SupplierWhereInput = { unidade_id: unitId };

    if (filters.razao_social !== undefined) {
      where.razao_social = { contains: filters.razao_social, mode: 'insensitive' };
    }

    if (filters.document !== undefined) {
      where.document = { contains: filters.document };
    }

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.brand_id !== undefined) {
      where.brands = { some: { brand_id: filters.brand_id } };
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { razao_social: 'asc' },
        include: fullInclude,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  findById(id: string, unitId: string): Promise<SupplierFull | null> {
    return this.prisma.supplier.findFirst({
      where: { id, unidade_id: unitId },
      include: fullInclude,
    });
  }

  findByDocument(document: string, unitId: string): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({
      where: { unidade_id_document: { unidade_id: unitId, document } },
    });
  }

  create(data: Prisma.SupplierCreateInput): Promise<SupplierFull> {
    return this.prisma.supplier.create({ data, include: fullInclude });
  }

  update(id: string, data: Prisma.SupplierUpdateInput): Promise<SupplierFull> {
    return this.prisma.supplier.update({ where: { id }, data, include: fullInclude });
  }

  deactivate(id: string, unitId: string): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: { id, unidade_id: unitId },
      data: { active: false },
    });
  }

  // ─── Addresses ───────────────────────────────────────────────────────────────

  findAddressById(addressId: string): Promise<SupplierAddress | null> {
    return this.prisma.supplierAddress.findUnique({ where: { id: addressId } });
  }

  addAddress(
    supplierId: string,
    data: Omit<Prisma.SupplierAddressCreateInput, 'supplier'>,
  ): Promise<SupplierAddress> {
    return this.prisma.supplierAddress.create({
      data: { ...data, supplier: { connect: { id: supplierId } } },
    });
  }

  updateAddress(
    addressId: string,
    data: Prisma.SupplierAddressUpdateInput,
  ): Promise<SupplierAddress> {
    return this.prisma.supplierAddress.update({ where: { id: addressId }, data });
  }

  async deleteAddress(addressId: string): Promise<void> {
    await this.prisma.supplierAddress.delete({ where: { id: addressId } });
  }

  // ─── Contacts ────────────────────────────────────────────────────────────────

  findContactById(contactId: string): Promise<SupplierContact | null> {
    return this.prisma.supplierContact.findUnique({ where: { id: contactId } });
  }

  addContact(
    supplierId: string,
    data: Omit<Prisma.SupplierContactCreateInput, 'supplier'>,
  ): Promise<SupplierContact> {
    return this.prisma.supplierContact.create({
      data: { ...data, supplier: { connect: { id: supplierId } } },
    });
  }

  updateContact(
    contactId: string,
    data: Prisma.SupplierContactUpdateInput,
  ): Promise<SupplierContact> {
    return this.prisma.supplierContact.update({ where: { id: contactId }, data });
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.prisma.supplierContact.delete({ where: { id: contactId } });
  }

  // ─── Brand links ─────────────────────────────────────────────────────────────

  async linkBrand(supplierId: string, brandId: string): Promise<void> {
    await this.prisma.supplierBrand.upsert({
      where: { supplier_id_brand_id: { supplier_id: supplierId, brand_id: brandId } },
      create: { supplier_id: supplierId, brand_id: brandId },
      update: {},
    });
  }

  async unlinkBrand(supplierId: string, brandId: string): Promise<void> {
    await this.prisma.supplierBrand.delete({
      where: { supplier_id_brand_id: { supplier_id: supplierId, brand_id: brandId } },
    });
  }

  async countNFLinks(id: string): Promise<number> {
    // TODO: implement when NF (Nota Fiscal) module exists.
    // Replace with: return this.prisma.notaFiscal.count({ where: { supplier_id: id } });
    void id;
    return 0;
  }
}
