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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AlertType, SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { AlertasService } from './alertas.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { QueryAlertEventDto } from './dto/query-alert-event.dto';
import { QueryAlertRuleDto } from './dto/query-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';

@ApiTags('Alertas')
@ApiBearerAuth()
@Controller('alertas')
export class AlertasController {
  constructor(private readonly service: AlertasService) {}

  // ─── Regras ──────────────────────────────────────────────────────────────────

  @Post('regras')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Criar regra de alerta' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Regra criada com sucesso' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Produto não encontrado' })
  createRule(
    @Body() dto: CreateAlertRuleDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.createRule(dto, user);
  }

  @Get('regras')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({ summary: 'Listar regras de alerta' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de regras' })
  findAllRules(
    @Query() query: QueryAlertRuleDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.findAllRules({ type: query.type, active: query.active }, user);
  }

  @Get('regras/:id')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({ summary: 'Detalhar regra de alerta' })
  @ApiParam({ name: 'id', description: 'UUID da regra' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Regra encontrada' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Regra não encontrada' })
  findRuleById(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.findRuleById(id, user);
  }

  @Patch('regras/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar regra (inclusive ativar/desativar)' })
  @ApiParam({ name: 'id', description: 'UUID da regra' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Regra atualizada' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Regra ou produto não encontrado' })
  updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRuleDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.updateRule(id, dto, user);
  }

  @Delete('regras/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir regra de alerta' })
  @ApiParam({ name: 'id', description: 'UUID da regra' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Regra excluída' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Regra não encontrada' })
  deleteRule(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.deleteRule(id, user);
  }

  // ─── Eventos ─────────────────────────────────────────────────────────────────

  @Get('eventos')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({ summary: 'Histórico de alertas disparados (paginado)' })
  @ApiQuery({ name: 'type', enum: AlertType, required: false, description: 'Filtrar por tipo' })
  @ApiQuery({ name: 'product_id', type: String, required: false, description: 'Filtrar por produto' })
  @ApiQuery({ name: 'data_inicio', type: String, required: false, description: 'Data início ISO 8601' })
  @ApiQuery({ name: 'data_fim', type: String, required: false, description: 'Data fim ISO 8601' })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Página (default 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Itens por página (default 20, max 100)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista paginada de eventos' })
  findAllEvents(
    @Query() query: QueryAlertEventDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.findAllEvents(query, user);
  }
}
