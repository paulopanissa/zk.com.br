import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { ReorderMediaDto } from './dto/reorder-media.dto';
import { SimulatePricingDto } from './dto/simulate-pricing.dto';
import { UpdateProductDeliveryDto } from './dto/update-product-delivery.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductFiscalDto } from './dto/update-product-fiscal.dto';
import { UpdateProductPricingDto } from './dto/update-product-pricing.dto';
import { UpdateProductSeoDto } from './dto/update-product-seo.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth('access-token')
@Roles(SystemRole.ADMINISTRADOR)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  // ─── CRUD básico ──────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar produto' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar produtos paginados com filtros' })
  findAll(@Query() filters: ListProductsDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findAll(filters, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados básicos do produto' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desativar produto (soft-delete)',
    description:
      'Define active=false. A guarda de lotes vinculados (409) estará ativa após a implementação do módulo 4 (Lotes/Estoque). Até lá, a desativação é sempre permitida.',
  })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.service.deactivate(id, user);
  }

  // ─── Pricing ──────────────────────────────────────────────────────────────────

  @Post(':id/pricing/simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simular margem sem persistir',
    description: 'Calcula margem e markup a partir de custo e preço de venda. Não salva nada.',
  })
  simulatePricing(
    @Param('id', ParseUUIDPipe) _id: string,
    @Body() dto: SimulatePricingDto,
  ) {
    return this.service.simulatePricing(dto);
  }

  @Patch(':id/pricing')
  @ApiOperation({ summary: 'Atualizar precificação do produto' })
  updatePricing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductPricingDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.updatePricing(id, dto, user);
  }

  // ─── Delivery ─────────────────────────────────────────────────────────────────

  @Patch(':id/delivery')
  @ApiOperation({ summary: 'Atualizar configurações de entrega do produto' })
  updateDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDeliveryDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.updateDelivery(id, dto, user);
  }

  // ─── Fiscal ───────────────────────────────────────────────────────────────────

  @Patch(':id/fiscal')
  @ApiOperation({
    summary: 'Atualizar campos fiscais do produto',
    description: 'NCM, CFOP, CEST, origens, CST/CSOSN, alíquotas. CST e CSOSN são mutuamente exclusivos.',
  })
  updateFiscal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductFiscalDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.updateFiscal(id, dto, user);
  }

  // ─── SEO ──────────────────────────────────────────────────────────────────────

  @Post(':id/seo/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Enfileirar geração de SEO/Schema.org via IA',
    description: 'Publica tarefa na fila RabbitMQ. Retorna 202. Aguardando módulo de IA (27).',
  })
  async generateSeo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    await this.service.enqueueSeoGeneration(id, user);
    return { message: 'SEO generation enqueued' };
  }

  @Patch(':id/seo')
  @ApiOperation({ summary: 'Atualizar campos SEO manualmente' })
  updateSeo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductSeoDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.updateSeo(id, dto, user);
  }

  // ─── Media ────────────────────────────────────────────────────────────────────

  @Post(':id/media')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adicionar mídia ao produto (stub)',
    description:
      'Placeholder para upload multipart. Requer módulo de Storage (25) para implementação completa.',
  })
  addMedia(
    @Param('id', ParseUUIDPipe) _id: string,
    @CurrentUser() _user: JwtSystemPayload,
  ) {
    // TODO: implement multipart upload when Storage module (25) is built
    return { message: 'Media upload not yet implemented. Awaiting Storage module (25).' };
  }

  @Patch(':id/media/reorder')
  @ApiOperation({ summary: 'Reordenar mídias do produto' })
  reorderMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderMediaDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.reorderMedia(id, dto, user);
  }

  @Delete(':id/media/:mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover mídia do produto' })
  async deleteMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.service.deleteMedia(id, mediaId, user);
  }
}
