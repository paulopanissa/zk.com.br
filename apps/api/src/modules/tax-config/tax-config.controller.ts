import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { SystemRole } from '@prisma/client';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { CreateNcmOverrideDto } from './dto/create-ncm-override.dto';
import { CreateTaxProfileDto } from './dto/create-tax-profile.dto';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { QueryNcmOverrideDto } from './dto/query-ncm-override.dto';
import { QueryTaxProfileDto } from './dto/query-tax-profile.dto';
import { UpdateNcmOverrideDto } from './dto/update-ncm-override.dto';
import { UpdateTaxProfileDto } from './dto/update-tax-profile.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { TaxConfigService } from './tax-config.service';

@ApiTags('tax-config')
@ApiBearerAuth('access-token')
@Roles(SystemRole.ADMINISTRADOR)
@Controller('tax-config')
export class TaxConfigController {
  constructor(private readonly taxConfigService: TaxConfigService) {}

  // ─── TaxProfile ─────────────────────────────────────────────────────────────

  @Get('profiles')
  @ApiOperation({ summary: 'Listar perfis tributários com paginação e filtros' })
  findAllProfiles(@Query() query: QueryTaxProfileDto) {
    return this.taxConfigService.findAllProfiles(query);
  }

  @Post('profiles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar perfil tributário',
    description:
      'Cria um novo perfil tributário. Se `padrao=true`, retorna 409 caso já exista ' +
      'um perfil padrão para o mesmo regime tributário.',
  })
  createProfile(@Body() dto: CreateTaxProfileDto) {
    return this.taxConfigService.createProfile(dto);
  }

  @Get('profiles/:id')
  @ApiOperation({ summary: 'Obter perfil tributário com suas alíquotas' })
  @ApiParam({ name: 'id', description: 'UUID do perfil tributário' })
  findProfileById(@Param('id') id: string) {
    return this.taxConfigService.findProfileById(id);
  }

  @Put('profiles/:id')
  @ApiOperation({
    summary: 'Atualizar perfil tributário',
    description:
      'Atualiza um perfil tributário. Retorna 409 se tentar definir `padrao=true` ' +
      'e já houver outro perfil padrão para o regime.',
  })
  @ApiParam({ name: 'id', description: 'UUID do perfil tributário' })
  updateProfile(@Param('id') id: string, @Body() dto: UpdateTaxProfileDto) {
    return this.taxConfigService.updateProfile(id, dto);
  }

  @Delete('profiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir perfil tributário',
    description:
      'Exclui o perfil e suas alíquotas (cascade). ' +
      'Retorna 409 se o perfil estiver marcado como padrão.',
  })
  @ApiParam({ name: 'id', description: 'UUID do perfil tributário' })
  deleteProfile(@Param('id') id: string): Promise<void> {
    return this.taxConfigService.deleteProfile(id);
  }

  // ─── TaxRate ─────────────────────────────────────────────────────────────────

  @Get('profiles/:id/rates')
  @ApiOperation({ summary: 'Listar alíquotas de um perfil tributário' })
  @ApiParam({ name: 'id', description: 'UUID do perfil tributário' })
  findRatesByProfile(@Param('id') id: string) {
    return this.taxConfigService.findRatesByProfileId(id);
  }

  @Post('profiles/:id/rates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar alíquota a um perfil tributário' })
  @ApiParam({ name: 'id', description: 'UUID do perfil tributário' })
  addRate(@Param('id') id: string, @Body() dto: CreateTaxRateDto) {
    return this.taxConfigService.addRateToProfile(id, dto);
  }

  @Put('profiles/:id/rates/:rateId')
  @ApiOperation({ summary: 'Atualizar uma alíquota do perfil' })
  @ApiParam({ name: 'id', description: 'UUID do perfil tributário' })
  @ApiParam({ name: 'rateId', description: 'UUID da alíquota' })
  updateRate(
    @Param('id') id: string,
    @Param('rateId') rateId: string,
    @Body() dto: UpdateTaxRateDto,
  ) {
    return this.taxConfigService.updateRate(id, rateId, dto);
  }

  @Delete('profiles/:id/rates/:rateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover uma alíquota do perfil' })
  @ApiParam({ name: 'id', description: 'UUID do perfil tributário' })
  @ApiParam({ name: 'rateId', description: 'UUID da alíquota' })
  deleteRate(
    @Param('id') id: string,
    @Param('rateId') rateId: string,
  ): Promise<void> {
    return this.taxConfigService.deleteRate(id, rateId);
  }

  // ─── NcmTaxOverride ─────────────────────────────────────────────────────────

  @Get('ncm-overrides')
  @ApiOperation({ summary: 'Listar exceções fiscais por NCM com paginação e filtros' })
  findAllNcmOverrides(@Query() query: QueryNcmOverrideDto) {
    return this.taxConfigService.findAllNcmOverrides(query);
  }

  @Post('ncm-overrides')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar exceção fiscal por NCM',
    description:
      'Cria uma exceção de alíquota para um NCM e imposto específico. ' +
      'Retorna 409 se já existir uma exceção para a mesma combinação NCM + imposto.',
  })
  createNcmOverride(@Body() dto: CreateNcmOverrideDto) {
    return this.taxConfigService.createNcmOverride(dto);
  }

  @Put('ncm-overrides/:id')
  @ApiOperation({ summary: 'Atualizar exceção fiscal por NCM' })
  @ApiParam({ name: 'id', description: 'UUID da exceção NCM' })
  updateNcmOverride(@Param('id') id: string, @Body() dto: UpdateNcmOverrideDto) {
    return this.taxConfigService.updateNcmOverride(id, dto);
  }

  @Delete('ncm-overrides/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir exceção fiscal por NCM' })
  @ApiParam({ name: 'id', description: 'UUID da exceção NCM' })
  deleteNcmOverride(@Param('id') id: string): Promise<void> {
    return this.taxConfigService.deleteNcmOverride(id);
  }

  // ─── Effective Rates ─────────────────────────────────────────────────────────

  @Get('effective-rates')
  @ApiOperation({
    summary: 'Consultar alíquotas efetivas para um perfil e NCM',
    description:
      'Retorna as alíquotas efetivas combinando o perfil tributário com as exceções NCM. ' +
      'Quando um imposto possui exceção NCM cadastrada, ela tem prioridade sobre a alíquota do perfil. ' +
      'O campo `source` indica a origem: `ncm_override` ou `profile`.',
  })
  @ApiQuery({ name: 'profile_id', description: 'UUID do perfil tributário', required: true })
  @ApiQuery({
    name: 'ncm',
    description: 'Código NCM (8 dígitos). Quando informado, aplica exceções NCM sobre o perfil.',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de alíquotas efetivas',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          imposto: { type: 'string', example: 'ICMS' },
          aliquota_percentual: {
            type: 'integer',
            example: 1200,
            description: 'Alíquota em centésimos de porcento (1200 = 12%)',
          },
          source: {
            type: 'string',
            enum: ['ncm_override', 'profile'],
            example: 'profile',
          },
        },
      },
    },
  })
  getEffectiveRates(
    @Query('profile_id') profileId: string,
    @Query('ncm') ncm?: string,
  ) {
    return this.taxConfigService.getEffectiveRates(profileId, ncm);
  }
}
