import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentChannel, PaymentEnvironment, PaymentProviderSlug, SystemRole } from '@prisma/client';
import { Public } from '../../common/auth/guards/public.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { SetChannelConfigDto } from './dto/set-channel-config.dto';
import { UpsertCredentialsDto } from './dto/upsert-credentials.dto';
import { UpsertMethodMappingDto } from './dto/upsert-method-mapping.dto';
import { PaymentConfigService } from './payment-config.service';

@ApiTags('payment-config')
@ApiBearerAuth('access-token')
@Controller('payment-config')
export class PaymentConfigController {
  constructor(private readonly service: PaymentConfigService) {}

  // ─── Providers ───────────────────────────────────────────────────────────────

  @Get('providers')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar provedores de pagamento (slug, nome, status)' })
  listProviders() {
    return this.service.listProviders();
  }

  @Get('providers/:slug')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Detalhar provedor com lista de credenciais configuradas (sem valores)',
  })
  @ApiParam({ name: 'slug', enum: PaymentProviderSlug })
  getProvider(@Param('slug') slug: PaymentProviderSlug) {
    return this.service.getProvider(slug);
  }

  @Put('providers/:slug/activate')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Habilitar provedor',
    description:
      'Valida se todas as credenciais obrigatórias estão presentes. Retorna 422 com lista de chaves ausentes se não estiver.',
  })
  @ApiParam({ name: 'slug', enum: PaymentProviderSlug })
  activateProvider(@Param('slug') slug: PaymentProviderSlug) {
    return this.service.activateProvider(slug);
  }

  @Put('providers/:slug/deactivate')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desabilitar provedor' })
  @ApiParam({ name: 'slug', enum: PaymentProviderSlug })
  deactivateProvider(@Param('slug') slug: PaymentProviderSlug) {
    return this.service.deactivateProvider(slug);
  }

  // ─── Credentials ─────────────────────────────────────────────────────────────

  @Put('providers/:slug/credentials')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Inserir ou atualizar credenciais do provedor',
    description:
      'Os valores são criptografados antes de serem armazenados. Nenhum valor é retornado nos GETs — apenas a chave e o ambiente.',
  })
  @ApiParam({ name: 'slug', enum: PaymentProviderSlug })
  upsertCredentials(
    @Param('slug') slug: PaymentProviderSlug,
    @Body() dto: UpsertCredentialsDto,
  ) {
    return this.service.upsertCredentials(slug, dto);
  }

  @Delete('providers/:slug/credentials/:key')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover credencial específica do provedor' })
  @ApiParam({ name: 'slug', enum: PaymentProviderSlug })
  @ApiParam({ name: 'key', description: 'Nome da chave da credencial (ex: ACCESS_TOKEN)' })
  @ApiQuery({ name: 'ambiente', enum: PaymentEnvironment })
  async deleteCredential(
    @Param('slug') slug: PaymentProviderSlug,
    @Param('key') key: string,
    @Query('ambiente') ambiente: PaymentEnvironment,
  ): Promise<void> {
    await this.service.deleteCredential(slug, key, ambiente);
  }

  // ─── Connectivity test ────────────────────────────────────────────────────────

  @Post('providers/:slug/test')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Testar conectividade com o provedor',
    description: 'Stub — implementação real por provedor será adicionada ao integrar os SDKs.',
  })
  @ApiParam({ name: 'slug', enum: PaymentProviderSlug })
  testProvider(@Param('slug') slug: PaymentProviderSlug) {
    return this.service.testProviderConnectivity(slug);
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  @Put('providers/:slug/webhook-secret')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Definir webhook secret do provedor (criptografado em repouso)',
    description: 'O valor é criptografado antes de ser armazenado e nunca retornado em GET.',
  })
  @ApiParam({ name: 'slug', enum: PaymentProviderSlug })
  setWebhookSecret(
    @Param('slug') slug: PaymentProviderSlug,
    @Body() body: { secret: string },
  ) {
    return this.service.setWebhookSecret(slug, body.secret);
  }

  @Post('providers/:slug/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receber webhook do provedor',
    description:
      'Verifica a assinatura HMAC-SHA256 no header X-Signature. ' +
      'Eventos duplicados são aceitos com accepted=true e duplicate=true. ' +
      'Retorna 401 se a assinatura for inválida.',
  })
  @ApiParam({ name: 'slug', enum: PaymentProviderSlug })
  @ApiHeader({
    name: 'X-Signature',
    description: 'HMAC-SHA256 do body em hex',
    required: true,
  })
  receiveWebhook(
    @Param('slug') slug: PaymentProviderSlug,
    @Body() body: object,
    @Headers('x-signature') signature: string,
  ) {
    return this.service.receiveWebhook(slug, body, signature);
  }

  // ─── Channels ────────────────────────────────────────────────────────────────

  @Get('channels')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar configurações de canal (PDV / ECOMMERCE)' })
  listChannelConfigs() {
    return this.service.listChannelConfigs();
  }

  @Put('channels/:canal')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Definir provedor padrão e ambiente para um canal' })
  @ApiParam({ name: 'canal', enum: PaymentChannel })
  setChannelConfig(
    @Param('canal') canal: PaymentChannel,
    @Body() dto: SetChannelConfigDto,
  ) {
    return this.service.setChannelConfig(canal, dto);
  }

  // ─── Method mappings ─────────────────────────────────────────────────────────

  @Get('methods')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar mapeamentos de método de pagamento por canal' })
  listMethodMappings() {
    return this.service.listMethodMappings();
  }

  @Put('methods')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Inserir ou atualizar mapeamento de método de pagamento',
    description:
      'MAQUININHA_POINT só é aceito para canal PDV com provedor MERCADO_PAGO. ' +
      'Retorna 422 se a combinação for inválida.',
  })
  upsertMethodMapping(@Body() dto: UpsertMethodMappingDto) {
    return this.service.upsertMethodMapping(dto);
  }

  @Patch('methods/:id/toggle')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Alternar status ativo/inativo do mapeamento de método' })
  @ApiParam({ name: 'id', description: 'ID do PaymentMethodMapping' })
  toggleMethodMapping(@Param('id') id: string) {
    return this.service.toggleMethodMapping(id);
  }
}
