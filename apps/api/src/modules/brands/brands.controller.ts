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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Atualizar dados de uma marca (nome, status, logo_url externa)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.brandsService.update(id, dto, user);
  }

  @Post(':id/logo')
  @Roles(SystemRole.ADMINISTRADOR)
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload do logotipo da marca',
    description: 'Aceita PNG, JPG, WebP ou SVG até 2 MB. Substitui o logo anterior se existir.',
  })
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.brandsService.uploadLogo(id, file, user);
  }

  @Delete(':id/logo')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover logotipo da marca' })
  removeLogo(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.brandsService.removeLogo(id, user);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir uma marca',
    description:
      'Exclui fisicamente a marca se não houver produtos vinculados. ' +
      'Se houver produtos, retorna 409 — use PATCH /:id com { active: false } para desativação.',
  })
  delete(@Param('id') id: string, @CurrentUser() user: JwtSystemPayload): Promise<void> {
    return this.brandsService.delete(id, user);
  }
}
