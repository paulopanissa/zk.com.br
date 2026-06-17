import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { BulkBrandDto } from './dto/bulk-brand.dto';
import { CreateNfDto } from './dto/create-nf.dto';
import { QueryNfDto } from './dto/query-nf.dto';
import { UpdateNfDto } from './dto/update-nf.dto';
import { UpdateNfItemDto } from './dto/update-nf-item.dto';
import { NfEntradaService } from './nf-entrada.service';

@ApiTags('nf-entrada')
@ApiBearerAuth('access-token')
@Controller('nf-entrada')
export class NfEntradaController {
  constructor(private readonly service: NfEntradaService) {}

  @Post('from-xml')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @UseInterceptors(FileInterceptor('xml', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload XML NFe — parsing + criação automática de rascunho',
    description:
      'Faz upload do arquivo XML de NFe, extrai todos os campos (fornecedor, itens, ' +
      'valores, lotes via rastro), cria/vincula fornecedor por CNPJ e retorna a NF em ' +
      'status RASCUNHO para revisão antes de confirmar.',
  })
  createFromXml(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.createFromXml(file.buffer, user);
  }

  @Post()
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar NF de entrada manualmente',
    description: 'Cria NF e seus itens manualmente (sem XML). Status inicial: RASCUNHO.',
  })
  create(
    @Body() dto: CreateNfDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @ApiOperation({
    summary: 'Listar NFs de entrada',
    description: 'Listagem paginada. Filtros: status, fornecedor_id, data_inicio, data_fim.',
  })
  listNfs(
    @Query() query: QueryNfDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.listNfs(query, user);
  }

  @Get(':id')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @ApiParam({ name: 'id', description: 'ID da NF de entrada' })
  @ApiOperation({ summary: 'Detalhar NF de entrada com itens' })
  getNf(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.getNf(id, user);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @ApiParam({ name: 'id', description: 'ID da NF de entrada' })
  @ApiOperation({
    summary: 'Atualizar cabeçalho da NF (apenas RASCUNHO)',
    description: 'Permite alterar fornecedor, data de entrada e observação.',
  })
  updateNf(
    @Param('id') id: string,
    @Body() dto: UpdateNfDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.updateNf(id, dto, user);
  }

  @Patch(':id/items/:itemId')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @ApiParam({ name: 'id', description: 'ID da NF de entrada' })
  @ApiParam({ name: 'itemId', description: 'ID do item' })
  @ApiOperation({
    summary: 'Vincular produto/marca a um item da NF',
    description:
      'Vincula product_id e brand_id ao item. Permite também ajustar lote_numero e datas de validade/fabricação.',
  })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateNfItemDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.updateItem(id, itemId, dto, user);
  }

  @Patch(':id/items')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @ApiParam({ name: 'id', description: 'ID da NF de entrada' })
  @ApiOperation({
    summary: 'Aplicar marca a todos os itens da NF em lote',
    description: 'Define brand_id em todos os itens da NF de uma vez.',
  })
  bulkSetBrand(
    @Param('id') id: string,
    @Body() dto: BulkBrandDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.bulkSetBrand(id, dto, user);
  }

  @Post(':id/attach-pdf')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @UseInterceptors(FileInterceptor('pdf', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID da NF de entrada' })
  @ApiOperation({
    summary: 'Anexar PDF/DANFE à NF',
    description:
      'Faz upload do PDF da NF para storage protegido (retenção fiscal 5 anos) e ' +
      'atualiza pdf_url na NF.',
  })
  attachPdf(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.attachPdf(id, file.buffer, user);
  }

  @Post(':id/confirm')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
  @ApiParam({ name: 'id', description: 'ID da NF de entrada' })
  @ApiOperation({
    summary: 'Confirmar NF — cria Lotes e StockMovements',
    description:
      'Confirma a NF em status RASCUNHO. Para cada item: cria um Lote e um StockMovement ' +
      '(tipo PURCHASE_ENTRY) de forma atômica. Idempotente: confirmar duas vezes não duplica. ' +
      'Todos os itens devem ter product_id vinculado (422 caso contrário).',
  })
  confirmNf(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.confirmNf(id, user);
  }

  @Post(':id/cancel')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiParam({ name: 'id', description: 'ID da NF de entrada' })
  @ApiOperation({
    summary: 'Cancelar NF (apenas RASCUNHO, apenas ADMINISTRADOR)',
  })
  cancelNf(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.cancelNf(id, user);
  }
}
