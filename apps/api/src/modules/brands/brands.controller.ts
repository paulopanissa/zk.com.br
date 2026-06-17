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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ListBrandsDto } from './dto/list-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@ApiTags('brands')
@ApiBearerAuth('access-token')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar marcas com paginação e filtros' })
  findAll(@Query() query: ListBrandsDto, @CurrentUser() user: JwtSystemPayload) {
    return this.brandsService.findAll(query, user);
  }

  @Get(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obter uma marca pelo ID' })
  findById(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.brandsService.findById(id, user);
  }

  @Post()
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova marca' })
  create(@Body() dto: CreateBrandDto, @CurrentUser() user: JwtSystemPayload) {
    return this.brandsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar dados de uma marca' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.brandsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir uma marca',
    description:
      'Exclui fisicamente a marca se não houver produtos vinculados. ' +
      'Se houver produtos, retorna 409 — use PATCH /:id com { active: false } para desativação. ' +
      // TODO: adicionar endpoints de upload/remoção de logo quando o módulo de storage estiver disponível.
      'Endpoints de logo (upload/remoção) serão adicionados quando o módulo de storage estiver implementado.',
  })
  delete(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload): Promise<void> {
    return this.brandsService.delete(id, user);
  }
}
