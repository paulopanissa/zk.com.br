import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { PricingInputDto } from './dto/pricing-input.dto';
import { PricingResultDto } from './dto/pricing-result.dto';
import { PricingEngineService } from './pricing-engine.service';

@ApiTags('pricing-engine')
@ApiBearerAuth('access-token')
@Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
@Controller('pricing-engine')
export class PricingEngineController {
  constructor(private readonly service: PricingEngineService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calcular preço sugerido e margem',
    description:
      'Recebe os componentes de custo (todos em centavos ou basis points) e retorna o preço sugerido ' +
      'de venda, a margem em reais e o detalhamento de cada componente. ' +
      'Nenhum dado é persistido — cálculo puro em memória.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado do cálculo de precificação',
    type: PricingResultDto,
  })
  @ApiResponse({
    status: 422,
    description:
      'A soma de despesas variáveis (impostos + taxa_cartao + comissao + custo_operacional_variavel) + margem_desejada_bps ≥ 10000 (100%) é inválida.',
  })
  calculate(@Body() dto: PricingInputDto): PricingResultDto {
    return this.service.calculate(dto);
  }
}
