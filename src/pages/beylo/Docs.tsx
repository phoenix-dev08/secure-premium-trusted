import React from 'react';
import { Link } from 'react-router-dom';
import { BeyloLogo, Button, Card, CardHeader, Badge, CopyButton } from '@/components/beylo/primitives';
import { Code2, Terminal, Webhook, ShieldCheck } from 'lucide-react';

const QUOTE_JSON = `{
  "quoteId": "qt_bey_9f82a1",
  "fiatCurrency": "GBP",
  "fiatAmount": 50000,
  "asset": "USDC",
  "network": "ethereum",
  "cryptoAmount": 67358.42,
  "exchangeRate": 0.7423,
  "expiresAt": "2026-09-18T15:05:00Z"
}`;

const PAYMENT_JSON = `{
  "paymentId": "BYL-240918-004",
  "providerPaymentId": "provider_demo_92838",
  "status": "awaiting_payment",
  "settlementCurrency": "GBP"
}`;

const INTERFACE_TS = `interface PaymentProvider {
  createPayment(input): Promise<ProviderPayment>;
  getSupportedAssets(): Promise<CryptoAsset[]>;
  createQuote(paymentId, gbpAmount, asset): Promise<Quote>;
  getPaymentInstructions(quote): Promise<PaymentInstructions>;
  getPaymentStatus(paymentId): Promise<PaymentStatusResult>;
  cancelPayment(paymentId): Promise<{ status: PaymentStatus }>;
  getSettlementStatus(settlementId): Promise<SettlementResult>;
  verifyWebhook(envelope): Promise<boolean>;
  processWebhook(envelope): Promise<{ handled: boolean }>;
}`;

const CodeBlock: React.FC<{ code: string; label: string }> = ({ code, label }) => (
  <div>
    <div className="mb-2 flex items-center justify-between">
      <p className="text-[12px] uppercase tracking-[0.1em] text-navy-400">{label}</p>
      <CopyButton value={code} label="Copy" />
    </div>
    <pre className="overflow-auto rounded-lg border border-line bg-navy-950 p-4 font-mono text-[12px] leading-relaxed text-navy-300">{code}</pre>
  </div>
);

const Docs: React.FC = () => (
  <div className="min-h-screen bg-canvas">
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <BeyloLogo subtitle="Documentation" />
        <div className="flex gap-2">
          <Link to="/dashboard"><Button variant="outline" size="sm">Dashboard</Button></Link>
          <Link to="/signin"><Button variant="primary" size="sm">Sign in</Button></Link>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Integration guide</p>
        <h1 className="mt-1 text-[28px] font-semibold text-navy-900">BEYLO API &amp; architecture</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-400">
          BEYLO exposes a thin, provider-agnostic payments API. Your systems talk to BEYLO; BEYLO talks to the payment
          infrastructure provider server-side. No provider credentials ever reach the browser.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Request flow" description="Browser → BEYLO Frontend → BEYLO Backend/API → Provider API" />
          <div className="space-y-3 p-5">
            {[
              ['1. Create payment', 'Merchant submits a GBP amount and reference. BEYLO persists a payment session and returns a hosted checkout URL.'],
              ['2. Asset discovery', 'Checkout calls getSupportedAssets(). Availability is provider-driven — never hardcoded.'],
              ['3. Quote', 'createQuote() returns a provider-locked crypto amount, rate and short expiry. BEYLO never computes market rates.'],
              ['4. Instructions', 'getPaymentInstructions() returns a provider-generated address, network and payment URI for the QR code.'],
              ['5. Confirmation', 'Provider webhooks (payment.detected → payment.confirmed) drive status. The customer never confirms payment themselves.'],
              ['6. Settlement', 'Provider converts and settles GBP. settlement.created / settlement.completed events reconcile the batch.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-line bg-canvas px-4 py-3">
                <p className="text-[13.5px] font-semibold text-navy-900">{t}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-navy-400">{d}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-900"><ShieldCheck className="h-4 w-4 text-finsuccess" /> Security model</p>
            <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-navy-400">
              <li>Provider keys held server-side only (env/secret manager).</li>
              <li>Webhook signatures verified before processing.</li>
              <li>Idempotent event handling with duplicate detection.</li>
              <li>Append-only audit logging of all state changes.</li>
            </ul>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-900"><Terminal className="h-4 w-4 text-gold-600" /> Reference stack</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['React', 'TypeScript', 'Tailwind', 'Node.js', 'PostgreSQL', 'Prisma', 'Redis'].map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5"><CodeBlock code={QUOTE_JSON} label="POST /v1/quotes · response" /></Card>
        <Card className="p-5"><CodeBlock code={PAYMENT_JSON} label="POST /v1/payments · response" /></Card>
        <Card className="p-5 lg:col-span-2">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-navy-900"><Code2 className="h-4 w-4 text-gold-600" /> Provider adapter interface</p>
          <CodeBlock code={INTERFACE_TS} label="lib/beylo/provider.ts" />
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Webhook events" description="Signed provider events consumed by the BEYLO webhook endpoint" />
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
          {[
            ['payment.created', 'Payment session registered with the provider'],
            ['payment.detected', 'Funds seen on-chain, awaiting confirmations'],
            ['payment.confirmed', 'Authoritative confirmation — merchant notified'],
            ['payment.failed', 'Underpayment, wrong network or provider error'],
            ['quote.expired', 'Locked rate released; a new quote is required'],
            ['settlement.created', 'GBP settlement batch opened'],
            ['settlement.completed', 'Funds paid to the merchant bank account'],
            ['merchant.verification.updated', 'KYB/KYC outcome changed'],
          ].map(([t, d]) => (
            <div key={t} className="flex items-start gap-3 px-5 py-3.5">
              <Webhook className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
              <div><p className="font-mono text-[12.5px] font-medium text-navy-900">{t}</p><p className="text-[12.5px] text-navy-400">{d}</p></div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  </div>
);

export default Docs;
