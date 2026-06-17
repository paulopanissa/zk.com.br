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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CuponsService } from './cupons.service';

@ApiTags('Cupons')
@ApiBearerAuth()
@Controller('cupons')
export class CuponsController {
  constructor(private readonly service: CuponsService) {}

  @Post()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Criar cupom de desconto' })
  create(@Body() dto: CreateCouponDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({ summary: 'Listar cupons com filtros e paginação' })
  findAll(@Query() query: QueryCouponDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiParam({ name: 'id', description: 'ID do cupom (UUID)' })
  @ApiOperation({ summary: 'Detalhar cupom por ID' })
  findById(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findById(id, user);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiParam({ name: 'id', description: 'ID do cupom (UUID)' })
  @ApiOperation({ summary: 'Atualizar cupom (inclusive ativar/desativar)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiParam({ name: 'id', description: 'ID do cupom (UUID)' })
  @ApiOperation({ summary: 'Excluir cupom (apenas se nunca utilizado)' })
  delete(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.delete(id, user);
  }

  @Post('validar')
  @HttpCode(HttpStatus.OK)
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({ summary: 'Validar código de cupom e calcular desconto para o carrinho atual' })
  validate(@Body() dto: ValidateCouponDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.validate(dto, user);
  }
}
