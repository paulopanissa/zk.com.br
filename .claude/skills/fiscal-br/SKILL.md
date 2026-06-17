---
name: fiscal-br
description: Regras fiscais brasileiras deste ERP — validação de CNPJ/CPF, importação do XML da nota de entrada do fornecedor, campos fiscais do produto e emissão de NFe/NFCe. Use SEMPRE que o trabalho envolver nota fiscal, XML, CNPJ, CPF, impostos, NCM, CFOP, CEST, emissão de nota, ou cadastro fiscal de produto — inclusive pedidos como "valida o CNPJ" ou "importa os produtos da nota". Evita erros legais e retrabalho de modelagem.
---

# Fiscal Brasil

## Validação de CNPJ/CPF

- Valide com o algoritmo de dígitos verificadores, não só máscara/formato. Documento com DV inválido é rejeitado no cadastro de empresa, fornecedor e cliente.
- **Armazene apenas os dígitos** (sem pontuação); formate só na exibição.
- Rejeite sequências inválidas conhecidas (ex: todos os dígitos iguais).

## Nota fiscal de entrada — dois caminhos

O cadastro de nota aceita **dois fluxos** (decisão do projeto):

1. **Manual** — operador preenche os dados.
2. **Upload de XML** — parseia a NFe do fornecedor (layout 4.00), pré-preenche tudo e guarda o arquivo.

Em ambos: persista a **origem** (`MANUAL` ou `XML`), o XML bruto e o PDF quando houver.

### Parsing do XML (entrada)

Do XML da NFe extraia:
- **Emitente** (`emit`): CNPJ, nome — usado para casar/cadastrar o fornecedor pelo documento.
- **Itens** (`det/prod`): `cProd` (código do fornecedor), `xProd` (descrição), `NCM`, `CFOP`, `uCom`, `qCom`, `vUnCom`, `vProd`, e EAN/GTIN (`cEAN`) quando presente.

Para cada item: tente casar com produto existente (por EAN/GTIN ou SKU); senão, ofereça cadastrar. Crie o **lote** a partir do item da nota (ver skill `estoque-lote-fifo`). Permita aplicar uma marca a todos os itens e trocar item a item.

## Campos fiscais do produto (capturar desde já)

Mesmo que a emissão venha depois, o produto precisa nascer pronto para faturar. Inclua na aba Fiscal:
- **NCM**, **CFOP**, **CEST** (quando aplicável), **origem da mercadoria**, situação tributária (**CST** ou **CSOSN** conforme regime), unidade tributável.

Sem esses campos não há emissão; adicioná-los depois é refatoração cara.

## Emissão de NFe/NFCe (fase posterior)

- Use **plataforma paga** (Focus NFe / eNotas / NFe.io). **Nunca** integre direto com a SEFAZ: cada UF tem webservice próprio, exige certificado digital, assinatura XML, layout complexo, contingência e manutenção eterna. A plataforma abstrai tudo isso.
- Esconda o provedor atrás de uma interface (`FiscalProvider`: emitir, consultar, cancelar, carta de correção). Trocar de plataforma não pode tocar a regra de negócio.
- Emissão é **assíncrona**: publique na fila e trate o retorno (autorizada/rejeitada) por callback/polling. Guarde a chave de acesso, o protocolo e o XML autorizado.
- O certificado digital fica sob responsabilidade/guarda da plataforma sempre que possível.

## Impostos

As alíquotas (ISS, ICMS, IPI, PIS, COFINS) são configuráveis e entram tanto na precificação (ver skill `precificacao`) quanto na emissão. Não fixe alíquota no código.

## Agentes relacionados

- `escritor-de-testes` testa validação de CNPJ/CPF e parsing do XML.
- `revisor-erp` verifica validação por dígito e emissão via plataforma.
