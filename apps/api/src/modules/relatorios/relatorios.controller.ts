import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { QueryClientesDto } from './dto/query-clientes.dto';
import { QueryEstoqueDto } from './dto/query-estoque.dto';
import { QueryProdutosDto } from './dto/query-produtos.dto';
import { QueryVendasDto } from './dto/query-vendas.dto';
import { RelatoriosService } from './relatorios.service';

@ApiTags('Relatórios')
@ApiBearerAuth()
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly service: RelatoriosService) {}

  @Get('vendas')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Relatório de vendas',
    description:
      'Retorna totalizadores de receita, descontos, ticket médio e top produtos no período informado. Escopo: unidade do usuário autenticado.',
  })
  getVendas(@Query() dto: QueryVendasDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.getVendas(dto, user);
  }

  @Get('estoque')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Relatório de posição de estoque',
    description:
      'Retorna o saldo atual de todos os produtos (derivado de stock_movements) e lotes próximos ao vencimento. Escopo: unidade do usuário autenticado.',
  })
  getEstoque(@Query() dto: QueryEstoqueDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.getEstoque(dto, user);
  }

  @Get('clientes')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Relatório de clientes',
    description:
      'Retorna compradores do período, novos clientes, recorrentes, ticket médio e top compradores. Escopo: unidade do usuário autenticado.',
  })
  getClientes(@Query() dto: QueryClientesDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.getClientes(dto, user);
  }

  @Get('produtos')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Relatório de desempenho de produtos',
    description:
      'Retorna melhores e piores produtos ordenados por volume de vendas ou margem (em basis points). Escopo: unidade do usuário autenticado.',
  })
  getProdutos(@Query() dto: QueryProdutosDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.getProdutos(dto, user);
  }
}
