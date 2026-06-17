import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { AiKeysService } from './ai-keys.service';
import { CreateAiKeyDto } from './dto/create-ai-key.dto';
import { QueryAiKeyDto } from './dto/query-ai-key.dto';
import { UpdateAiKeyDto } from './dto/update-ai-key.dto';

@ApiTags('AI Keys')
@ApiBearerAuth()
@Controller('ai-keys')
@Roles(SystemRole.ADMINISTRADOR)
export class AiKeysController {
  constructor(private readonly service: AiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar API key de provedor de IA' })
  create(@Body() dto: CreateAiKeyDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar API keys da unidade (valor mascarado)' })
  findAll(@Query() query: QueryAiKeyDto, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findAll(user, query.provider);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar API key por ID (valor mascarado)' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar label, valor ou status da key' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAiKeyDto,
    @CurrentUser() user: JwtSystemPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover API key' })
  remove(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.remove(id, user);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testar conectividade da key com o provedor' })
  testKey(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: JwtSystemPayload) {
    return this.service.testKey(id, user);
  }
}
