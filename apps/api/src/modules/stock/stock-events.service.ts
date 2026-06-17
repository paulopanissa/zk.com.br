import { Injectable, Logger } from '@nestjs/common';

/**
 * Stub do publisher de eventos de estoque via RabbitMQ.
 *
 * TODO (worker): Ao implementar o módulo worker (RabbitMQ), substituir os logs por publicação real
 * no exchange de eventos. Shape do evento esperado:
 *   { event: 'stock.low_alert', data: { productId, unitId, currentBalance, minStock } }
 */
@Injectable()
export class StockEventsService {
  private readonly logger = new Logger(StockEventsService.name);

  publishLowStockAlert(
    productId: string,
    unitId: string,
    currentBalance: number,
    minStock: number,
  ): void {
    this.logger.warn(
      `LOW_STOCK_ALERT product=${productId} unit=${unitId} balance=${currentBalance} min=${minStock}`,
    );
  }
}
