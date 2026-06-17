import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { AiIntegrationService } from './ai-integration.service';
import { GenerateContentDto } from './dto/generate-content.dto';

@ApiTags('AI - Geração de Conteúdo')
@ApiBearerAuth()
@Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_ESTOQUE_COMPRAS)
@Controller('ai/generations')
export class AiIntegrationController {
  constructor(private readonly service: AiIntegrationService) {}

  @Post()
  @ApiOperation({ summary: 'Solicitar geração de conteúdo para um produto' })
  requestGeneration(@Body() dto: GenerateContentDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.requestGeneration(dto, user);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Listar gerações de um produto' })
  findByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.findByProduct(productId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma geração' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findOne(id, user);
  }

  @Post(':id/apply')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Aplicar conteúdo gerado ao produto' })
  apply(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.applyGeneration(id, user);
  }
}
