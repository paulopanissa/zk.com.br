import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

export interface ParsedNfItem {
  numeroItem: number;
  ean: string | null;
  codigoProduto: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidadeMedida: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  loteNumero: string | null;
  dataValidade: string | null;
  dataFabricacao: string | null;
}

export interface ParsedNfXml {
  chaveAcesso: string;
  numero: string;
  serie: string | null;
  dataEmissao: string;
  emitCnpj: string;
  emitNome: string;
  valorTotal: number;
  items: ParsedNfItem[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  processEntities: false,
  isArray: (name) => name === 'det' || name === 'rastro',
});

function toMoney(val: unknown): number {
  return Math.round(parseFloat(String(val ?? '0')) * 100);
}

function nullIfSemGtin(val: unknown): string | null {
  const s = String(val ?? '').trim();
  if (!s || s === 'SEM GTIN') return null;
  return s;
}

@Injectable()
export class XmlParserService {
  parse(xmlBuffer: Buffer): ParsedNfXml {
    let raw: Record<string, unknown>;
    try {
      raw = parser.parse(xmlBuffer.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new UnprocessableEntityException('XML mal-formado');
    }

    const nfeNode = (raw as any)?.nfeProc?.NFe ?? (raw as any)?.NFe;
    if (!nfeNode) {
      throw new UnprocessableEntityException('Estrutura de NFe não reconhecida (falta nó NFe)');
    }

    const inf = nfeNode?.infNFe;
    if (!inf) {
      throw new UnprocessableEntityException('Elemento infNFe ausente no XML');
    }

    const idAttr: string = (inf as any)['@_Id'] ?? '';
    const chaveAcesso = idAttr.replace(/^NFe/, '');
    if (!/^\d{44}$/.test(chaveAcesso)) {
      throw new UnprocessableEntityException(
        `Chave de acesso inválida: esperado 44 dígitos, obtido '${chaveAcesso}'`,
      );
    }

    const ide = (inf as any).ide ?? {};
    const emit = (inf as any).emit ?? {};
    const total = (inf as any).total?.ICMSTot ?? {};

    const emitCnpj = String(emit.CNPJ ?? '').replace(/\D/g, '');
    if (emitCnpj.length !== 14) {
      throw new UnprocessableEntityException(
        `CNPJ do emitente inválido: '${emit.CNPJ}'`,
      );
    }

    const detArray: unknown[] = Array.isArray((inf as any).det)
      ? ((inf as any).det as unknown[])
      : [];

    if (detArray.length === 0) {
      throw new UnprocessableEntityException('NFe sem itens (nenhum elemento det)');
    }

    const items: ParsedNfItem[] = detArray.map((det: unknown) => {
      const d = det as Record<string, any>;
      const prod = d.prod ?? {};
      const nItem = parseInt(String(d['@_nItem'] ?? '0'), 10);

      const rastroArr: unknown[] = Array.isArray(d.rastro) ? d.rastro : [];
      const rastro = rastroArr[0] as Record<string, string> | undefined;

      return {
        numeroItem: nItem,
        ean: nullIfSemGtin(prod.cEAN),
        codigoProduto: prod.cProd ? String(prod.cProd) : null,
        descricao: String(prod.xProd ?? '').slice(0, 500),
        ncm: prod.NCM ? String(prod.NCM).padStart(8, '0') : null,
        cfop: prod.CFOP ? String(prod.CFOP) : null,
        unidadeMedida: prod.uCom ? String(prod.uCom).slice(0, 6) : null,
        quantidade: parseFloat(String(prod.qCom ?? '0')),
        valorUnitario: toMoney(prod.vUnCom),
        valorTotal: toMoney(prod.vProd),
        loteNumero: rastro?.nLote ? String(rastro.nLote).slice(0, 100) : null,
        dataValidade: rastro?.dVal ?? null,
        dataFabricacao: rastro?.dFab ?? null,
      };
    });

    return {
      chaveAcesso,
      numero: String(ide.nNF ?? ''),
      serie: ide.serie ? String(ide.serie) : null,
      dataEmissao: String(ide.dhEmi ?? ide.dEmi ?? ''),
      emitCnpj,
      emitNome: String(emit.xNome ?? emit.xFant ?? '').slice(0, 200),
      valorTotal: toMoney(total.vNF),
      items,
    };
  }
}
