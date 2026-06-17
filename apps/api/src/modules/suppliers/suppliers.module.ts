import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersRepository } from './suppliers.repository';
import { SuppliersService } from './suppliers.service';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersRepository, SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
