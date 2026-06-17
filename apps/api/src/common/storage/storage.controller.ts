import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { SignedUrlQueryDto } from './dto/signed-url-query.dto';
import { StorageService } from './storage.service';
import { SignedUrlResult } from './storage.types';

/** TTL máximo (segundos) para arquivos fiscais — obrigação de confidencialidade */
const FISCAL_MAX_TTL = 600;
const DEFAULT_TTL = 3600;

@ApiTags('storage')
@ApiBearerAuth('access-token')
@Roles(SystemRole.ADMINISTRADOR)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('signed-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter URL assinada para acesso a arquivo privado',
    description:
      'Gera uma URL temporária e assinada para download de arquivo armazenado no storage. ' +
      'Arquivos em fiscal/ têm TTL limitado a 600 segundos (10 min) independente do valor informado.',
  })
  @ApiResponse({
    status: 200,
    description: 'URL assinada gerada com sucesso',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://storage.example.com/logos/brands/uuid.png?X-Amz-Expires=3600' },
        expires_at: { type: 'string', format: 'date-time', example: '2026-06-17T13:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMINISTRADOR)' })
  async getSignedUrl(@Query() query: SignedUrlQueryDto): Promise<SignedUrlResult> {
    const requestedTtl = query.ttl ?? DEFAULT_TTL;

    // Arquivos fiscais têm TTL máximo de 600s (10 min) por razão de confidencialidade
    const isFiscal = query.key.startsWith('fiscal/');
    const ttl = isFiscal ? Math.min(requestedTtl, FISCAL_MAX_TTL) : requestedTtl;

    return this.storageService.getSignedUrl(query.key, ttl);
  }
}
