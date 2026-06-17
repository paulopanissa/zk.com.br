import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoUnidade } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtSystemPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUnitId(user: JwtSystemPayload): Promise<string> {
    if (user.unidade_id) return user.unidade_id;

    // ADMIN without unit: fall back to active MATRIZ
    const matriz = await this.prisma.unit.findFirst({
      where: { tipo: TipoUnidade.MATRIZ, ativa: true },
      select: { id: true },
    });

    if (!matriz) {
      throw new NotFoundException(
        'Nenhuma unidade MATRIZ ativa. Configure a MATRIZ antes de operar.',
      );
    }

    return matriz.id;
  }
}
