import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { CreateLgpdRequestDto } from './dto/create-request.dto';
import { ProcessLgpdRequestDto } from './dto/process-request.dto';
import { QueryLgpdRequestsDto } from './dto/query-requests.dto';
import { LgpdService } from './lgpd.service';

@ApiTags('lgpd')
@ApiBearerAuth('access-token')
@Controller('lgpd')
export class LgpdController {
  constructor(private readonly lgpdService: LgpdService) {}

  @Get('requests')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Listar solicitações LGPD (DPO)',
    description:
      'Lista paginada de solicitações de titulares. Filtros: status, tipo, customer_id. ' +
      'Inclui flag prazo_vencido calculada em runtime. dados_exportados nunca retornados na listagem.',
  })
  listRequests(
    @Query() query: QueryLgpdRequestsDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.lgpdService.listRequests(query, user);
  }

  @Post('requests')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar solicitação LGPD em nome do titular',
    description:
      'Registra solicitação formal de titular (Arts. 18–20 LGPD). ' +
      'prazo_legal = data atual + 15 dias corridos. ' +
      'O cliente deve pertencer à unidade do usuário autenticado.',
  })
  createRequest(
    @Body() dto: CreateLgpdRequestDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.lgpdService.createRequest(dto, user);
  }

  @Get('requests/:id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Detalhar solicitação LGPD',
    description:
      'Retorna todos os campos, incluindo dados_exportados quando tipo=EXPORTACAO e status=CONCLUIDA.',
  })
  @ApiParam({ name: 'id', description: 'ID da solicitação LGPD' })
  getRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.lgpdService.getRequest(id, user);
  }

  @Patch('requests/:id/process')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Processar solicitação LGPD (DPO)',
    description:
      'Processa uma solicitação pendente. Ações por tipo: ' +
      'EXPORTACAO → compila PII descriptografada + audit log em dados_exportados. ' +
      'EXCLUSAO → anonimiza o cliente (não deleta fisicamente). ' +
      'REVOGACAO_CONSENTIMENTO → revoga consentimento LGPD do cliente. ' +
      'RETIFICACAO → marca como concluída (edição via PATCH /customers/:id). ' +
      'Status REJEITADA exige justificativa (422 sem ela).',
  })
  @ApiParam({ name: 'id', description: 'ID da solicitação LGPD' })
  processRequest(
    @Param('id') id: string,
    @Body() dto: ProcessLgpdRequestDto,
    @CurrentUser() user: JwtSystemPayload,
    @Ip() ip: string,
  ) {
    return this.lgpdService.processRequest(id, dto, user, ip);
  }
}
