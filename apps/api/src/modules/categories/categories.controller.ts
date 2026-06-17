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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ─── IMPORTANTE: rotas estáticas ANTES de rotas parametrizadas (/flat, /reorder antes de /:id) ───

  @Get()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar categorias raiz com subcategorias', description: 'Retorna árvore de 2 níveis. Use ?active=true para filtrar apenas ativas.' })
  findAll(
    @Query() query: ListCategoriesDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.categoriesService.findAll(query, user);
  }

  @Get('flat')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar todas as categorias em lista plana com campo depth (0=raiz, 1=sub)' })
  findFlat(@CurrentUser() user: JwtSystemPayload) {
    return this.categoriesService.findFlat(user);
  }

  @Patch('reorder')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reordenar categorias — atualiza sort_order em lote' })
  reorder(
    @Body() dto: ReorderCategoriesDto,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<void> {
    return this.categoriesService.reorder(dto, user);
  }

  @Get(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obter categoria por ID (inclui subcategorias)' })
  findById(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.categoriesService.findById(id, user);
  }

  @Post()
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar categoria ou subcategoria' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: JwtSystemPayload) {
    return this.categoriesService.create(dto, user);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar categoria' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.categoriesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir categoria (bloqueia se tiver subcategorias ou produtos vinculados)' })
  delete(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload): Promise<void> {
    return this.categoriesService.delete(id, user);
  }

  // TODO: Endpoints de imagem (upload/remoção) — implementar quando o módulo de storage (S3/R2) for configurado
}
