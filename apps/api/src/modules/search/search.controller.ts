import {
  Controller,
  ForbiddenException,
  Get,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { PDV_ALLOWED_TYPES, QuerySearchDto, SearchEntityType } from './dto/query-search.dto';
import { SearchService } from './search.service';
import { SearchResults } from './types/search-results.type';

const ALL_TYPES = Object.values(SearchEntityType);

@ApiTags('search')
@ApiBearerAuth('access-token')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  @Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)
  @ApiOperation({
    summary: 'Busca global (omnisearch)',
    description:
      'Busca em produtos, clientes, fornecedores, categorias e marcas via pg_trgm + ILIKE. ' +
      'OPERADOR_PDV acessa apenas products e customers.',
  })
  async search(
    @Query() query: QuerySearchDto,
    @CurrentUser() user: JwtSystemPayload,
  ): Promise<SearchResults> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const isAdmin = user.role === SystemRole.ADMINISTRADOR;

    // Determine which types this role can see
    const allowedTypes: SearchEntityType[] = isAdmin ? ALL_TYPES : PDV_ALLOWED_TYPES;

    // Resolve requested types: default to all allowed, or filter by requested
    let requestedTypes: SearchEntityType[];
    if (query.types && query.types.length > 0) {
      const forbidden = query.types.filter((t) => !allowedTypes.includes(t));
      if (forbidden.length > 0) {
        throw new ForbiddenException(
          `Tipo(s) não permitido(s) para este perfil: ${forbidden.join(', ')}`,
        );
      }
      requestedTypes = query.types;
    } else {
      requestedTypes = allowedTypes;
    }

    return this.searchService.search(query.q, unitId, requestedTypes, query.limit ?? 5);
  }
}
