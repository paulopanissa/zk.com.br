import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateSystemUserDto } from './dto/create-system-user.dto';
import { UpdateSystemUserDto } from './dto/update-system-user.dto';
import { JwtSystemPayload } from './types/jwt-payload.type';

@ApiTags('auth/system/users')
@ApiBearerAuth('access-token')
@Controller('auth/system/users')
export class SystemUsersController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Criar usuário do sistema' })
  create(@Body() dto: CreateSystemUserDto) {
    return this.authService.createUser(dto);
  }

  @Get()
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar usuários do sistema' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.authService.listUsers(page, limit);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualizar dados do usuário' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSystemUserDto) {
    return this.authService.updateUser(id, dto);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Alterar senha (próprio usuário ou ADMINISTRADOR)' })
  changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() requester: JwtSystemPayload,
  ) {
    return this.authService.changePassword(id, dto, requester.sub);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar usuário (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.deactivateUser(id);
  }
}
