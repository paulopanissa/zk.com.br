---
name: pagamentos
description: Integração de pagamentos deste ERP — abstração de provedores (gateways) configurável por canal e por método, maquininha Mercado Pago Point no PDV, PIX, webhooks e idempotência. Use SEMPRE que o trabalho envolver pagamento, gateway, checkout, maquininha, Mercado Pago, Asaas, Stripe, PIX, boleto, ou conciliação — inclusive pedidos como "integra o pagamento do PDV" ou "recebe o webhook do gateway".
---

# Pagamentos

## Abstração de provedores (não acoplar a um gateway)

Gateway é **configuração**, não decisão fixa. Defina uma interface única que todo provedor implementa:

```ts
interface PaymentProvider {
  createCharge(input): Promise<Charge>;     // idempotente
  getStatus(chargeId): Promise<Status>;
  refund(chargeId, amount?): Promise<Refund>;
  handleWebhook(payload, signature): Promise<Event>; // verifica assinatura
}
```

Mercado Pago, Asaas, Stripe, PagSeguro e PayPal são implementações dessa interface. Trocar de provedor não toca a regra de negócio.

## Seleção por canal e por método

O provedor é resolvido em runtime a partir das Configurações:
- **Canal**: E-commerce e PDV podem usar gateways iguais ou diferentes.
- **Método**: dentro do PDV, cartão e PIX podem ter provedores distintos (ex: cartão = maquininha Point; PIX = QR de outro provedor).

Nunca chumbe o provedor no código; sempre pergunte ao serviço de configuração "qual provedor para canal X, método Y".

## PDV — maquininha Mercado Pago Point (Smart 2 / Pro 3)

- Integração via **API Point (nuvem)**: o backend faz POST com `device_id` + valor; a cobrança vai pela nuvem do Mercado Pago até a máquina; o resultado volta por **webhook**.
- Isso **exige internet** no momento da cobrança automática.
- **Offline (feira)**: não há auto-envio. O operador digita o valor na própria maquininha (modo autônomo) e ela cobra pelo 4G dela; o PDV apenas registra "pago no cartão" para **reconciliar depois**. A venda em si é registrada offline (ver skill `estoque-lote-fifo`).

## Idempotência e webhooks

- **createCharge** usa chave de idempotência (ex: id da venda) para que um retry de rede não gere cobrança duplicada.
- **Webhooks** devem ser idempotentes (mesmo evento pode chegar mais de uma vez) e ter a **assinatura verificada** antes de qualquer ação. O status da venda só muda a partir do webhook/confirmação, nunca por "achismo" do front.

## Segurança (PCI)

- **Nunca** armazene ou trafegue dados de cartão pela sua API. A tokenização e a captura do cartão ficam com o provedor/maquininha.
- Chaves de API dos gateways ficam criptografadas e fora do código (ver skill `seguranca-lgpd`).

## Conciliação

Para vendas pagas em modo offline ou em fluxos manuais, mantenha um processo de conciliação que casa o registro do PDV com o recebimento reportado pelo provedor.

## Checklist

- [ ] Provedor atrás de interface; nenhum gateway chumbado no código.
- [ ] Resolução por canal e método via configuração.
- [ ] createCharge idempotente; webhook idempotente e com assinatura verificada.
- [ ] Status muda só por confirmação do provedor.
- [ ] Nenhum dado de cartão na API; chaves criptografadas.

## Agentes relacionados

- `seguranca-ecommerce` audita fraude no checkout e manipulação de pagamento.
- `revisor-erp` verifica idempotência, webhook assinado e ausência de dado de cartão.
