import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { CostCenterService } from './cost-center.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { CreateCostItemDto } from './dto/create-cost-item.dto';
import { ListCostCentersDto } from './dto/list-cost-centers.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { UpdateCostItemDto } from './dto/update-cost-item.dto';

@ApiTags('cost-centers')
@ApiBearerAuth('access-token')
@Controller('cost-centers')
export class CostCenterController {
  constructor(private readonly costCenterService: CostCenterService) {}

  // Static route must be declared before :id to avoid route shadowing
  @Get('summary')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Resumo dos custos ativos',
    description:
      'Retorna o total fixo em centavos, o total variável em basis points e todos os itens ativos da unidade.',
  })
  getSummary(@CurrentUser() user: JwtSystemPayload) {
    return this.costCenterService.getSummary(user);
  }

  @Get()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar centros de custo com paginação e filtros' })
  findAll(@Query() query: ListCostCentersDto, @CurrentUser() user: JwtSystemPayload) {
    return this.costCenterService.findAll(query, user);
  }

  @Post()
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo centro de custo' })
  create(@Body() dto: CreateCostCenterDto, @CurrentUser() user: JwtSystemPayload) {
    return this.costCenterService.create(dto, user);
  }

  @Get(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obter centro de custo pelo ID (inclui itens)' })
  findById(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.costCenterService.findById(id, user);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar dados de um centro de custo' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.costCenterService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desativar um centro de custo',
    description:
      'Desativa o centro de custo (soft delete via ativo = false). ' +
      'Retorna 422 se houver itens ativos vinculados — desative os itens primeiro.',
  })
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload): Promise<void> {
    return this.costCenterService.deactivate(id, user).then(() => undefined);
  }

  @Get(':id/items')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar itens de um centro de custo (retornados junto ao GET /:id)' })
  findItems(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.costCenterService.findById(id, user).then((cc) => cc.items);
  }

  @Post(':id/items')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar item ao centro de custo' })
  addItem(
    @Param('id') id: string,
    @Body() dto: CreateCostItemDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.costCenterService.addItem(id, dto, user);
  }

  @Patch(':id/items/:itemId')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar item de custo' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCostItemDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.costCenterService.updateItem(id, itemId, dto, user);
  }

  @Delete(':id/items/:itemId')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desativar item de custo',
    description: 'Desativa o item (ativo = false). Após desativar todos os itens, é possível desativar o centro de custo.',
  })
  deactivateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.costCenterService.deactivateItem(id, itemId, user).then(() => undefined);
  }
}
