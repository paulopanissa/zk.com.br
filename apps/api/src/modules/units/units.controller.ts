import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsDto } from './dto/list-units.dto';
import { UpdateUnitConfigDto } from './dto/update-unit-config.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UpsertUnitAddressDto } from './dto/upsert-unit-address.dto';
import { UnitsService } from './units.service';

@ApiTags('units')
@ApiBearerAuth('access-token')
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar todas as unidades' })
  findAll(@Query() query: ListUnitsDto) {
    return this.unitsService.findAll(query.includeInactive);
  }

  @Get(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obter uma unidade pelo ID' })
  findById(@Param('id') id: string) {
    return this.unitsService.findById(id);
  }

  @Post()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Criar nova unidade' })
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Put(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar dados de uma unidade' })
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar uma unidade' })
  deactivate(@Param('id') id: string): Promise<void> {
    return this.unitsService.deactivate(id);
  }

  @Put(':id/address')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Criar ou substituir o endereço de uma unidade' })
  upsertAddress(@Param('id') id: string, @Body() dto: UpsertUnitAddressDto) {
    return this.unitsService.upsertAddress(id, dto);
  }

  @Get(':id/config')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obter a configuração de uma unidade' })
  getConfig(@Param('id') id: string) {
    return this.unitsService.getConfig(id);
  }

  @Put(':id/config')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar a configuração de uma unidade' })
  updateConfig(@Param('id') id: string, @Body() dto: UpdateUnitConfigDto) {
    return this.unitsService.updateConfig(id, dto);
  }
}
