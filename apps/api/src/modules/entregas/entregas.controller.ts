import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { IncomingMessage } from 'http';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Public } from '../../common/auth/guards/public.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { EntregasService } from './entregas.service';
import { CreateDeliveryConfigDto } from './dto/create-delivery-config.dto';
import { UpdateDeliveryConfigDto } from './dto/update-delivery-config.dto';
import { QuoteDeliveryDto } from './dto/quote-delivery.dto';

@ApiTags('Entregas')
@ApiBearerAuth('access-token')
@Controller('entregas')
export class EntregasController {
  constructor(private readonly service: EntregasService) {}

  // ─── Config ──────────────────────────────────────────────────────────────────

  @Get('config')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Obter configuração de entrega da unidade autenticada',
    description: 'Retorna a configuração sem expor as credenciais criptografadas.',
  })
  getConfig(@CurrentUser() user: JwtSystemPayload) {
    return this.service.getConfig(user);
  }

  @Post('config')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Criar configuração de entrega (Uber Direct)',
    description:
      'As credenciais (client_id, client_secret, customer_id, webhook_secret) são ' +
      'criptografadas com AES-256-GCM em repouso e nunca retornadas em GET. ' +
      'Uma unidade só pode ter uma configuração — use PATCH para atualizar.',
  })
  createConfig(
    @Body() dto: CreateDeliveryConfigDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.createConfig(dto, user);
  }

  @Patch('config')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Atualizar configuração de entrega',
    description:
      'Atualização parcial — apenas os campos enviados são alterados. ' +
      'Campos de credencial enviados são mesclados com os existentes (criptografados).',
  })
  updateConfig(
    @Body() dto: UpdateDeliveryConfigDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.updateConfig(dto, user);
  }

  // ─── Quote ───────────────────────────────────────────────────────────────────

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Cotação de frete em tempo real',
    description:
      'Chama a Uber Direct para obter cotação. Se o total do carrinho atingir o threshold ' +
      'de frete grátis da unidade, retorna fee_centavos=0 e provider=FRETE_GRATIS sem ' +
      'consumir a API externa. O quote_id retornado é válido por 15 minutos.',
  })
  quote(@Body() dto: QuoteDeliveryDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.quote(dto, user);
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  /**
   * Endpoint público recebendo webhooks da Uber Direct.
   * A unidade é identificada via parâmetro de rota, permitindo que cada unidade
   * configure uma URL distinta no dashboard Uber Direct.
   *
   * Segurança: a assinatura HMAC SHA-256 é verificada antes de qualquer processamento.
   * O handler sempre retorna 200 para a Uber — erros internos não são expostos.
   */
  @Post('webhook/uber/:unitId')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receber webhook da Uber Direct (público — validado via HMAC)',
    description:
      'Verifica x-uber-signature com HMAC SHA-256 sobre o body cru. ' +
      'Atualiza o status da entrega conforme evento dapi.status_changed. ' +
      'Sempre retorna 200 para a Uber — erros não são propagados.',
  })
  @ApiParam({
    name: 'unitId',
    description: 'ID da unidade (UUID) — configura a URL no dashboard Uber Direct',
  })
  @ApiHeader({
    name: 'x-uber-signature',
    description: 'HMAC-SHA256 do body cru em hex — enviado pela Uber Direct',
    required: true,
  })
  async handleUberWebhook(
    @Req() req: RawBodyRequest<IncomingMessage>,
    @Param('unitId', new ParseUUIDPipe()) unitId: string,
    @Headers('x-uber-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody ?? Buffer.alloc(0);
    try {
      await this.service.handleUberWebhook(rawBody, signature ?? '', unitId);
    } catch {
      // Nunca vazar detalhes internos para a Uber — apenas logar no service
    }
    return { received: true };
  }
}
