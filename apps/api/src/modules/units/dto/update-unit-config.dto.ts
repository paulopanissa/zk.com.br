import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateUnitConfigDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Unidade gerencia estoque próprio (false = compartilha com a matriz)',
  })
  @IsBoolean()
  @IsOptional()
  estoque_proprio?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Unidade possui caixa próprio',
  })
  @IsBoolean()
  @IsOptional()
  caixa_proprio?: boolean;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'ID do gateway de pagamento PDV específico desta unidade (sobrescreve o global)',
  })
  @IsUUID()
  @IsOptional()
  gateway_pdv_override_id?: string;

  @ApiPropertyOptional({
    example: 'America/Sao_Paulo',
    description: 'Timezone da unidade (IANA timezone string)',
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}
