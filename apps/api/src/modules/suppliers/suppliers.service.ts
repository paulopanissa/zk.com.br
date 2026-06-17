import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, SupplierAddress, SupplierContact } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import {
  deriveTipoDocumento,
  validateCnpjCpf,
} from '../../common/validators/cnpj-cpf.validator';
import { CreateSupplierAddressDto } from './dto/create-supplier-address.dto';
import { CreateSupplierContactDto } from './dto/create-supplier-contact.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { UpdateSupplierAddressDto } from './dto/update-supplier-address.dto';
import { UpdateSupplierContactDto } from './dto/update-supplier-contact.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierFull, SupplierPage, SuppliersRepository } from './suppliers.repository';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly repository: SuppliersRepository,
    private readonly tenancy: TenancyService,
  ) {}

  async create(dto: CreateSupplierDto, user: JwtSystemPayload): Promise<SupplierFull> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const document = dto.document.replace(/\D/g, '');

    if (!validateCnpjCpf(document)) {
      throw new UnprocessableEntityException(
        'Documento inválido: dígito verificador incorreto',
      );
    }

    const document_type = deriveTipoDocumento(document);

    const existing = await this.repository.findByDocument(document, unitId);
    if (existing) {
      throw new ConflictException('Já existe um fornecedor com este documento nesta unidade');
    }

    const createData: Prisma.SupplierCreateInput = {
      document,
      document_type,
      razao_social: dto.razao_social,
      nome_fantasia: dto.nome_fantasia,
      email: dto.email,
      phone: dto.phone,
      website: dto.website,
      notes: dto.notes,
      unit: { connect: { id: unitId } },
    };

    return this.repository.create(createData);
  }

  async findAll(filters: ListSuppliersDto, user: JwtSystemPayload): Promise<SupplierPage> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { razao_social, document, active, brand_id, page = 1, limit = 20 } = filters;
    return this.repository.findAll(
      unitId,
      { razao_social, document, active, brand_id },
      { page, limit },
    );
  }

  async findById(id: string, user: JwtSystemPayload): Promise<SupplierFull> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const supplier = await this.repository.findById(id, unitId);

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    return supplier;
  }

  async findByDocument(document: string, user: JwtSystemPayload): Promise<SupplierFull> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const cleaned = document.replace(/\D/g, '');
    const supplier = await this.repository.findById(
      // findByDocument returns Supplier (no includes); re-fetch via findById using the scoped findByDocument result
      (await this.repository.findByDocument(cleaned, unitId))?.id ?? '',
      unitId,
    );

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    return supplier;
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    user: JwtSystemPayload,
  ): Promise<SupplierFull> {
    const supplier = await this.findById(id, user);
    const unitId = await this.tenancy.resolveUnitId(user);

    const updateData: Prisma.SupplierUpdateInput = {};

    if (dto.document !== undefined) {
      const document = dto.document.replace(/\D/g, '');

      if (!validateCnpjCpf(document)) {
        throw new UnprocessableEntityException(
          'Documento inválido: dígito verificador incorreto',
        );
      }

      if (document !== supplier.document) {
        const conflict = await this.repository.findByDocument(document, unitId);
        if (conflict) {
          throw new ConflictException(
            'Já existe outro fornecedor com este documento nesta unidade',
          );
        }
      }

      updateData.document = document;
      updateData.document_type = deriveTipoDocumento(document);
    }

    if (dto.razao_social !== undefined) updateData.razao_social = dto.razao_social;
    if (dto.nome_fantasia !== undefined) updateData.nome_fantasia = dto.nome_fantasia;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.active !== undefined) updateData.active = dto.active;

    return this.repository.update(id, updateData);
  }

  async deactivate(id: string, user: JwtSystemPayload): Promise<void> {
    const unitId = await this.tenancy.resolveUnitId(user);
    await this.findById(id, user);

    const nfLinks = await this.repository.countNFLinks(id);
    if (nfLinks > 0) {
      throw new ConflictException(
        'Fornecedor possui notas fiscais vinculadas. Desative-o em vez de excluir.',
      );
    }

    await this.repository.deactivate(id, unitId);
  }

  // ─── Addresses ───────────────────────────────────────────────────────────────

  async addAddress(
    id: string,
    dto: CreateSupplierAddressDto,
    user: JwtSystemPayload,
  ): Promise<SupplierAddress> {
    const supplier = await this.findById(id, user);
    if (!supplier.active) {
      throw new UnprocessableEntityException('Fornecedor inativo não pode receber novos endereços');
    }
    return this.repository.addAddress(id, dto);
  }

  async updateAddress(
    id: string,
    addressId: string,
    dto: UpdateSupplierAddressDto,
    user: JwtSystemPayload,
  ): Promise<SupplierAddress> {
    await this.findById(id, user);

    const address = await this.repository.findAddressById(addressId);
    if (!address || address.supplier_id !== id) {
      throw new NotFoundException('Endereço não encontrado para este fornecedor');
    }

    return this.repository.updateAddress(addressId, dto);
  }

  async deleteAddress(
    id: string,
    addressId: string,
    user: JwtSystemPayload,
  ): Promise<void> {
    await this.findById(id, user);

    const address = await this.repository.findAddressById(addressId);
    if (!address || address.supplier_id !== id) {
      throw new NotFoundException('Endereço não encontrado para este fornecedor');
    }

    await this.repository.deleteAddress(addressId);
  }

  // ─── Contacts ────────────────────────────────────────────────────────────────

  async addContact(
    id: string,
    dto: CreateSupplierContactDto,
    user: JwtSystemPayload,
  ): Promise<SupplierContact> {
    const supplier = await this.findById(id, user);
    if (!supplier.active) {
      throw new UnprocessableEntityException('Fornecedor inativo não pode receber novos contatos');
    }
    return this.repository.addContact(id, dto);
  }

  async updateContact(
    id: string,
    contactId: string,
    dto: UpdateSupplierContactDto,
    user: JwtSystemPayload,
  ): Promise<SupplierContact> {
    await this.findById(id, user);

    const contact = await this.repository.findContactById(contactId);
    if (!contact || contact.supplier_id !== id) {
      throw new NotFoundException('Contato não encontrado para este fornecedor');
    }

    return this.repository.updateContact(contactId, dto);
  }

  async deleteContact(
    id: string,
    contactId: string,
    user: JwtSystemPayload,
  ): Promise<void> {
    await this.findById(id, user);

    const contact = await this.repository.findContactById(contactId);
    if (!contact || contact.supplier_id !== id) {
      throw new NotFoundException('Contato não encontrado para este fornecedor');
    }

    await this.repository.deleteContact(contactId);
  }

  // ─── Brand links ─────────────────────────────────────────────────────────────

  async linkBrands(
    id: string,
    brandIds: string[],
    user: JwtSystemPayload,
  ): Promise<SupplierFull> {
    await this.findById(id, user);

    await Promise.all(brandIds.map((brandId) => this.repository.linkBrand(id, brandId)));

    return this.findById(id, user);
  }

  async unlinkBrand(
    id: string,
    brandId: string,
    user: JwtSystemPayload,
  ): Promise<void> {
    await this.findById(id, user);
    await this.repository.unlinkBrand(id, brandId);
  }
}
