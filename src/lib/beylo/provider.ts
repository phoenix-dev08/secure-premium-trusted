// ---------------------------------------------------------------------------
// BEYLO Provider Abstraction Layer
// ---------------------------------------------------------------------------
// BEYLO never touches blockchains, wallets, liquidity or FX itself. All crypto
// processing, quoting, address generation, conversion and GBP settlement is
// delegated to an external payment infrastructure provider behind this
// interface. The concrete provider has not been selected yet, so the prototype
// ships with the "BEYLO Sandbox Provider" adapter which simulates realistic
// API latency and responses.
//
// In production every method below executes SERVER-SIDE only (BEYLO Backend →
// Provider API). Provider credentials are never present in frontend code.
// ---------------------------------------------------------------------------

import {
  CryptoAsset,
  PaymentInstructions,
  PaymentStatus,
  Quote,
  SettlementStatus,
} from './types';

export interface CreatePaymentInput {
  gbpAmount: number;
  reference: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  expiryMinutes: number;
}

export interface ProviderPayment {
  paymentId: string;
  providerPaymentId: string;
  status: PaymentStatus;
  settlementCurrency: 'GBP';
  hostedUrl: string;
  expiresAt: string;
}

export interface ProviderWebhookEnvelope {
  id: string;
  type: string;
  signature: string;
  payload: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;
  readonly mode: 'sandbox' | 'live';
  createPayment(input: CreatePaymentInput): Promise<ProviderPayment>;
  getSupportedAssets(): Promise<CryptoAsset[]>;
  createQuote(paymentId: string, gbpAmount: number, asset: string): Promise<Quote>;
  getPaymentInstructions(quote: Quote): Promise<PaymentInstructions>;
  getPaymentStatus(paymentId: string): Promise<{ status: PaymentStatus; confirmations: number }>;
  cancelPayment(paymentId: string): Promise<{ status: PaymentStatus }>;
  getSettlementStatus(settlementId: string): Promise<{ status: SettlementStatus; expectedDate: string }>;
  verifyWebhook(envelope: ProviderWebhookEnvelope): Promise<boolean>;
  processWebhook(envelope: ProviderWebhookEnvelope): Promise<{ handled: boolean; note: string }>;
}

// --- Sandbox reference rates (provider supplied, never computed by BEYLO) ----
const SANDBOX_RATES: Record<string, number> = {
  USDC: 0.7423,
  USDT: 0.7419,
  BTC: 51248.62,
  ETH: 2864.15,
  SOL: 118.42,
};

export const SANDBOX_ASSETS: CryptoAsset[] = [
  { asset: 'USDC', name: 'USD Coin', network: 'ethereum', networkLabel: 'Ethereum', type: 'stablecoin', confirmationsRequired: 12, enabled: true },
  { asset: 'USDT', name: 'Tether', network: 'ethereum', networkLabel: 'Ethereum', type: 'stablecoin', confirmationsRequired: 12, enabled: true },
  { asset: 'BTC', name: 'Bitcoin', network: 'bitcoin', networkLabel: 'Bitcoin', type: 'crypto', confirmationsRequired: 2, enabled: true },
  { asset: 'ETH', name: 'Ethereum', network: 'ethereum', networkLabel: 'Ethereum', type: 'crypto', confirmationsRequired: 12, enabled: true },
  { asset: 'USDC', name: 'USD Coin', network: 'polygon', networkLabel: 'Polygon', type: 'stablecoin', confirmationsRequired: 30, enabled: true },
  { asset: 'SOL', name: 'Solana', network: 'solana', networkLabel: 'Solana', type: 'crypto', confirmationsRequired: 32, enabled: false },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hex = (len: number) => Array.from({ length: len }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const seq = () => String(Math.floor(Math.random() * 900) + 100);

export const buildPaymentId = (date = new Date()): string => {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `BYL-${yy}${mm}${dd}-${seq()}`;
};

class BeyloSandboxProvider implements PaymentProvider {
  readonly name = 'BEYLO Sandbox Provider';
  readonly mode = 'sandbox' as const;

  async createPayment(input: CreatePaymentInput): Promise<ProviderPayment> {
    await wait(650);
    const paymentId = buildPaymentId();
    return {
      paymentId,
      providerPaymentId: `provider_demo_${Math.floor(Math.random() * 90000) + 10000}`,
      status: 'awaiting_payment',
      settlementCurrency: 'GBP',
      hostedUrl: `pay.beylo.co.uk/p/${paymentId}`,
      expiresAt: new Date(Date.now() + input.expiryMinutes * 60_000).toISOString(),
    };
  }

  async getSupportedAssets(): Promise<CryptoAsset[]> {
    await wait(400);
    // Availability is provider-driven — BEYLO must never assume an asset/network pair.
    return SANDBOX_ASSETS.filter((a) => a.enabled);
  }

  async createQuote(paymentId: string, gbpAmount: number, asset: string): Promise<Quote> {
    await wait(900);
    const meta = SANDBOX_ASSETS.find((a) => a.asset === asset) ?? SANDBOX_ASSETS[0];
    const base = SANDBOX_RATES[asset] ?? 1;
    // Small jitter simulates a live provider rate refresh.
    const rate = base * (1 + (Math.random() - 0.5) * 0.0025);
    const cryptoAmount = gbpAmount / rate;
    return {
      quoteId: `qt_bey_${hex(6)}`,
      fiatCurrency: 'GBP',
      fiatAmount: gbpAmount,
      asset,
      network: meta.network,
      networkLabel: meta.networkLabel,
      cryptoAmount,
      exchangeRate: rate,
      providerFeeGbp: Math.round(gbpAmount * 0.003 * 100) / 100,
      networkFeeNote: 'Network fee included in quote',
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      provider: this.name,
    };
  }

  async getPaymentInstructions(quote: Quote): Promise<PaymentInstructions> {
    await wait(500);
    const address =
      quote.network === 'bitcoin'
        ? `bc1q${hex(32)}`
        : quote.network === 'solana'
        ? hex(44)
        : `0x${hex(40)}`;
    return {
      address,
      asset: quote.asset,
      network: quote.network,
      networkLabel: quote.networkLabel,
      cryptoAmount: quote.cryptoAmount,
      paymentUri:
        quote.network === 'bitcoin'
          ? `bitcoin:${address}?amount=${quote.cryptoAmount.toFixed(6)}`
          : `ethereum:${address}?value=${quote.cryptoAmount.toFixed(2)}&asset=${quote.asset}`,
      expiresAt: quote.expiresAt,
    };
  }

  async getPaymentStatus(): Promise<{ status: PaymentStatus; confirmations: number }> {
    await wait(300);
    return { status: 'awaiting_payment', confirmations: 0 };
  }

  async cancelPayment(): Promise<{ status: PaymentStatus }> {
    await wait(400);
    return { status: 'cancelled' };
  }

  async getSettlementStatus(): Promise<{ status: SettlementStatus; expectedDate: string }> {
    await wait(400);
    return { status: 'settlement_pending', expectedDate: new Date(Date.now() + 86_400_000).toISOString() };
  }

  async verifyWebhook(envelope: ProviderWebhookEnvelope): Promise<boolean> {
    await wait(120);
    return Boolean(envelope.signature);
  }

  async processWebhook(envelope: ProviderWebhookEnvelope): Promise<{ handled: boolean; note: string }> {
    await wait(220);
    return { handled: true, note: `${envelope.type} applied to ledger` };
  }
}

export const paymentProvider: PaymentProvider = new BeyloSandboxProvider();

// Simulated provider status-progression used by the checkout session UI.
// In production these transitions arrive from provider webhooks / polling.
export const CHECKOUT_STAGES: { key: PaymentStatus | 'complete'; title: string; message: string }[] = [
  { key: 'awaiting_payment', title: 'Awaiting Payment', message: 'This page will update automatically when your payment is detected.' },
  { key: 'payment_detected', title: 'Payment Detected', message: 'We’ve detected your payment. Waiting for network confirmation.' },
  { key: 'confirming', title: 'Network Confirmation', message: 'Your transaction is being confirmed on the network.' },
  { key: 'confirmed', title: 'Payment Confirmed', message: 'Your payment has been successfully confirmed.' },
  { key: 'completed', title: 'Conversion Processing', message: 'Funds are being converted and prepared for GBP settlement.' },
  { key: 'complete', title: 'Complete', message: 'Payment complete. A receipt is available below.' },
];
