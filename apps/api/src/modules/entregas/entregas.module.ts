import { Module } from '@nestjs/common';
import { EntregasController } from './entregas.controller';
import { EntregasService } from './entregas.service';
import { EntregasRepository } from './entregas.repository';
import { UberDirectService } from './uber-direct.service';

/**
 * Módulo de Entregas — Spec 17 do PRD.
 *
 * Responsabilidades:
 * - CRUD de configuração de entrega por unidade (credenciais Uber Direct criptografadas)
 * - Cotação de frete em tempo real via Uber Direct API
 * - Criação de entrega (chamada pelo worker via fila após VendaEvent.DELIVERY_REQUESTED)
 * - Recepção e validação de webhooks da Uber Direct (HMAC SHA-256)
 *
 * Dependências globais utilizadas (sem necessidade de importar):
 * - CryptoModule (CryptoService) — AES-256-GCM para credenciais
 * - RedisModule (RedisService) — cache do token Uber Direct (TTL 29 dias)
 * - TenancyModule (TenancyService) — resolução de unidade_id
 * - PrismaModule (PrismaService) — acesso ao banco
 */
@Module({
  controllers: [EntregasController],
  providers: [EntregasRepository, EntregasService, UberDirectService],
  exports: [EntregasService],
})
export class EntregasModule {}
