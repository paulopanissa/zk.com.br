import { Module } from '@nestjs/common';
import { NfEntradaController } from './nf-entrada.controller';
import { NfEntradaRepository } from './nf-entrada.repository';
import { NfEntradaService } from './nf-entrada.service';
import { XmlParserService } from './xml-parser.service';

@Module({
  controllers: [NfEntradaController],
  providers: [NfEntradaRepository, NfEntradaService, XmlParserService],
})
export class NfEntradaModule {}
