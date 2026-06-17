import { ApiProperty } from '@nestjs/swagger';
import { PaymentProviderSlug } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para recebimento de webhook via header.
 * O body do webhook é tipado como `object` — o conteúdo exato varia por provedor.
 * Validação do payload é feita via assinatura HMAC (X-Signature header), não via class-validator.
 */
export class WebhookHeadersDto {
  @ApiProperty({
    example: 'abc123hex...',
    description: 'Assinatura HMAC-SHA256 enviada no header X-Signature',
  })
  @IsString()
  @IsNotEmpty()
  'x-signature': string;
}

export class WebhookParamDto {
  @ApiProperty({ enum: PaymentProviderSlug })
  @IsEnum(PaymentProviderSlug)
  slug!: PaymentProviderSlug;
}
