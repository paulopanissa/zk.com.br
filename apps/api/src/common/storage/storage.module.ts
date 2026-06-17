import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalDriver } from './drivers/local.driver';
import { R2Driver } from './drivers/r2.driver';
import { S3Driver } from './drivers/s3.driver';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

/**
 * Módulo de storage transversal (@Global).
 * Seleciona o driver via env STORAGE_PROVIDER: 's3' | 'r2' | 'local' (padrão).
 * Exporta StorageService para injeção em qualquer módulo sem importar StorageModule diretamente.
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    {
      provide: StorageService,
      useFactory: (config: ConfigService): StorageService => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'local').toLowerCase();
        if (provider === 's3') return new S3Driver(config);
        if (provider === 'r2') return new R2Driver(config);
        return new LocalDriver(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
