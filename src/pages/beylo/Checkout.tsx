import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AssetOption,
  CheckoutPageShell,
  Countdown,
  MerchantSummary,
  NetworkWarning,
  PrimaryCta,
  QuoteRow,
  StatusStepper,
  rateLine,
} from '@/components/beylo/checkout/CheckoutParts';
import { Badge, Button, Card, CopyButton, Money } from '@/components/beylo/primitives';
import QRCode from '@/components/beylo/QRCode';
import { paymentProvider, CHECKOUT_STAGES } from '@/lib/beylo/provider';
import { getPayment, setPaymentStatus, updatePayment, savePayment } from '@/lib/beylo/ledger';
import { CryptoAsset, Payment, PaymentInstructions, Quote } from '@/lib/beylo/types';
import { CHECKOUT_DEMO } from '@/data/beylo';
import { gbp, crypto as fmtCrypto, dateLong, truncateMiddle, num } from '@/lib/beylo/format';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Download, Loader2, RefreshCw, ShieldCheck, XOctagon } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'select' | 'quote' | 'instructions' | 'success' | 'expired' | 'failed' | 'missing';

const QUOTE_SECONDS = 600;
const FAIL_REASONS = ['Insufficient Amount', 'Unsupported Network', 'Quote Expired', 'Provider Error'];

const Checkout: React.FC = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [session, setSession] = React.useState<Payment | null>(() =>
    id ? getPayment(id) ?? null : null,
  );

  // Prefer ledger / seed payment; fall back to query params or the static demo checkout.
  const paymentId = session?.paymentId ?? id ?? CHECKOUT_DEMO.paymentId;
  const amountParam = Number(params.get('amount'));
  const gbpAmount = session?.gbpAmount ?? (amountParam > 0 ? amountParam : CHECKOUT_DEMO.gbpAmount);
  const reference = session?.reference ?? params.get('ref') ?? CHECKOUT_DEMO.reference;
  const description = session?.description ?? params.get('desc') ?? CHECKOUT_DEMO.description;
  const merchantName = session?.merchantName ?? CHECKOUT_DEMO.merchantName;

  const [step, setStep] = React.useState<Step>(() => {
    if (id) {
      const existing = getPayment(id);
      if (!existing && !params.get('amount')) return 'missing';
      if (existing?.status === 'completed' || existing?.status === 'confirmed') return 'success';
      if (existing?.status === 'expired') return 'expired';
      if (existing?.status === 'failed' || existing?.status === 'cancelled') return 'failed';
    }
    return 'select';
  });
  const [assets, setAssets] = React.useState<CryptoAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = React.useState(true);
  const [selected, setSelected] = React.useState<CryptoAsset | null>(null);
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [instructions, setInstructions] = React.useState<PaymentInstructions | null>(null);
  const [quoting, setQuoting] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(QUOTE_SECONDS);
  const [stageIndex, setStageIndex] = React.useState(0);
  const [completedAt, setCompletedAt] = React.useState<string | null>(null);
  const [failReason, setFailReason] = React.useState(FAIL_REASONS[0]);

  React.useEffect(() => {
    if (id) {
      const found = getPayment(id);
      setSession(found ?? null);
      if (!found && !params.get('amount')) setStep('missing');
      return;
    }
    // Seed the static demo checkout into the ledger so status updates persist.
    const existing = getPayment(CHECKOUT_DEMO.paymentId);
    if (!existing) {
      savePayment({
        paymentId: CHECKOUT_DEMO.paymentId,
        providerPaymentId: 'provider_demo_checkout',
        merchantId: 'MER-10428',
        merchantName: CHECKOUT_DEMO.merchantName,
        createdAt: new Date().toISOString(),
        reference: CHECKOUT_DEMO.reference,
        description: CHECKOUT_DEMO.description,
        gbpAmount: CHECKOUT_DEMO.gbpAmount,
        status: 'awaiting_payment',
        settlementStatus: 'not_started',
        settlementCurrency: 'GBP',
        createdBy: 'Demo Checkout',
        expiryMinutes: 60,
        timeline: [{ label: 'Payment Created', timestamp: new Date().toISOString(), detail: 'Public demo checkout' }],
      });
    }
    setSession(getPayment(CHECKOUT_DEMO.paymentId) ?? null);
  }, [id, params]);

  React.useEffect(() => {
    let live = true;
    paymentProvider
      .getSupportedAssets()
      .then((a) => { if (live) { setAssets(a); setSelected(a[0] ?? null); } })
      .finally(() => live && setLoadingAssets(false));
    return () => { live = false; };
  }, []);

  // Quote / payment window countdown (provider-controlled expiry).
  React.useEffect(() => {
    if (step !== 'quote' && step !== 'instructions') return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          setPaymentStatus(paymentId, 'expired', {}, 'Quote / payment window expired');
          setStep('expired');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [step, paymentId]);

  // Simulated provider webhook/polling driven status progression.
  React.useEffect(() => {
    if (step !== 'instructions' || !quote) return;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => {
      setStageIndex(1);
      setPaymentStatus(paymentId, 'payment_detected', {}, 'Mempool detection via provider');
    }, 7000));
    timers.push(window.setTimeout(() => {
      setStageIndex(2);
      setPaymentStatus(paymentId, 'confirming', {}, 'Awaiting network confirmations');
    }, 12000));
    timers.push(window.setTimeout(() => {
      setStageIndex(3);
      setPaymentStatus(paymentId, 'confirmed', {
        asset: quote.asset,
        network: quote.networkLabel,
        cryptoAmount: quote.cryptoAmount,
        exchangeRate: quote.exchangeRate,
      }, 'Provider webhook payment.confirmed');
    }, 18000));
    timers.push(window.setTimeout(() => {
      setStageIndex(4);
      setPaymentStatus(paymentId, 'completed', {
        settlementStatus: 'conversion_processing',
      }, `${quote.asset} → GBP conversion initiated`);
    }, 23000));
    timers.push(
      window.setTimeout(() => {
        setStageIndex(5);
        const doneAt = new Date().toISOString();
        setCompletedAt(doneAt);
        updatePayment(paymentId, {
          status: 'completed',
          settlementStatus: 'settlement_pending',
          asset: quote.asset,
          network: quote.networkLabel,
          cryptoAmount: quote.cryptoAmount,
          exchangeRate: quote.exchangeRate,
        }, { label: 'Settlement Initiated', timestamp: doneAt, detail: 'Queued for next GBP settlement batch' });
        setSession(getPayment(paymentId) ?? null);
        setStep('success');
      }, 28000),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [step, paymentId, quote]);

  const requestQuote = async (asset: CryptoAsset) => {
    setQuoting(true);
    try {
      const q = await paymentProvider.createQuote(paymentId, gbpAmount, asset.asset, asset.network);
      setQuote({ ...q, network: asset.network, networkLabel: asset.networkLabel });
      updatePayment(paymentId, {
        asset: asset.asset,
        network: asset.networkLabel,
      }, { label: 'Quote Generated', timestamp: new Date().toISOString(), detail: `${q.quoteId} · locked for 10:00` });
      setSecondsLeft(QUOTE_SECONDS);
      setStep('quote');
    } catch {
      setFailReason('Provider Error');
      setPaymentStatus(paymentId, 'failed', {}, 'Provider Error');
      setStep('failed');
    } finally {
      setQuoting(false);
    }
  };

  const continueToPayment = async () => {
    if (!quote) return;
    setQuoting(true);
    try {
      const ins = await paymentProvider.getPaymentInstructions(quote);
      setInstructions(ins);
      setStageIndex(0);
      setStep('instructions');
    } catch {
      setFailReason('Provider Error');
      setPaymentStatus(paymentId, 'failed', {}, 'Provider Error');
      setStep('failed');
    } finally {
      setQuoting(false);
    }
  };

  const restart = () => {
    setStep('select');
    setQuote(null);
    setInstructions(null);
    setStageIndex(0);
    setSecondsLeft(QUOTE_SECONDS);
    setPaymentStatus(paymentId, 'awaiting_payment', {}, 'New quote requested');
  };

  if (step === 'missing') {
    return (
      <CheckoutPageShell>
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-finerror-soft">
            <XOctagon className="h-8 w-8 text-finerror" />
          </span>
          <h1 className="mt-5 text-[24px] font-semibold text-navy-900">Payment not found</h1>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-navy-400">
            No payment session matches <span className="font-mono text-navy-700">{id}</span>. Ask your merchant for a fresh payment link.
          </p>
        </div>
      </CheckoutPageShell>
    );
  }

  /* ------------------------------ Success ------------------------------ */
  if (step === 'success') {
    const paidAsset = quote?.asset ?? session?.asset;
    const paidAmount = quote?.cryptoAmount ?? session?.cryptoAmount;
    const paidRate = quote?.exchangeRate ?? session?.exchangeRate;
    const paidNetwork = quote?.networkLabel ?? session?.network;
    return (
      <CheckoutPageShell>
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-finsuccess-soft">
            <CheckCircle2 className="h-9 w-9 text-finsuccess" />
          </span>
          <h1 className="mt-5 text-[24px] font-semibold text-navy-900">Payment Successful</h1>
          <div className="mt-3"><Money size="xl">{gbp(gbpAmount)}</Money> <span className="text-[13px] font-medium text-navy-400">GBP</span></div>
          <p className="mt-2 text-[13.5px] text-navy-400">
            {paidAsset && paidAmount ? `Paid using ${fmtCrypto(paidAmount, paidAsset)}` : 'Paid and queued for GBP settlement'}
          </p>

          <Card className="mt-6 text-left">
            <div className="divide-y divide-line px-5">
              <QuoteRow label="Merchant" value={merchantName} />
              <QuoteRow label="Reference" value={reference} />
              <QuoteRow label="Payment ID" value={<span className="font-mono text-[13px]">{paymentId}</span>} />
              <QuoteRow label="Network" value={paidNetwork ?? '—'} />
              <QuoteRow label="Exchange rate" value={paidAsset && paidRate ? rateLine(paidAsset, paidRate) : '—'} />
              <QuoteRow label="Completed" value={completedAt ? `${dateLong(completedAt)}, ${new Date(completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : '—'} />
            </div>
          </Card>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="primary" size="lg" onClick={() => toast.success('Receipt PDF downloaded')}>
              <Download className="h-4 w-4" /> Download Receipt
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/dashboard/transactions')}>View in dashboard</Button>
          </div>
          <p className="mt-5 text-[12.5px] text-navy-400">A confirmation has been sent to the merchant. Settlement to the merchant will be made in GBP.</p>
        </div>
      </CheckoutPageShell>
    );
  }

  /* ------------------------------ Expired ------------------------------ */
  if (step === 'expired') {
    return (
      <CheckoutPageShell>
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-900/5">
            <Clock className="h-8 w-8 text-navy-400" />
          </span>
          <h1 className="mt-5 text-[24px] font-semibold text-navy-900">Payment Expired</h1>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-navy-400">
            This payment session has expired and the quoted exchange rate is no longer available. Your merchant payment
            request is still valid, so a new quote can be requested.
          </p>
          <Card className="mt-6 text-left">
            <div className="divide-y divide-line px-5">
              <QuoteRow label="Amount due" value={gbp(gbpAmount)} strong />
              <QuoteRow label="Reference" value={reference} />
              <QuoteRow label="Payment ID" value={<span className="font-mono text-[13px]">{paymentId}</span>} />
            </div>
          </Card>
          <div className="mt-5">
            <PrimaryCta onClick={restart}><RefreshCw className="h-4 w-4" /> Request New Quote</PrimaryCta>
          </div>
        </div>
      </CheckoutPageShell>
    );
  }

  /* ------------------------------- Failed ------------------------------ */
  if (step === 'failed') {
    return (
      <CheckoutPageShell>
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-finerror-soft">
            <XOctagon className="h-8 w-8 text-finerror" />
          </span>
          <h1 className="mt-5 text-[24px] font-semibold text-navy-900">Payment Unsuccessful</h1>
          <p className="mt-2 text-[13.5px] text-navy-400">We couldn’t complete this payment. No funds have been settled to the merchant.</p>
          <Card className="mt-6 text-left">
            <div className="divide-y divide-line px-5">
              <QuoteRow label="Reason reported by provider" value={<Badge tone="error">{failReason}</Badge>} />
              <QuoteRow label="Amount due" value={gbp(gbpAmount)} strong />
              <QuoteRow label="Payment ID" value={<span className="font-mono text-[13px]">{paymentId}</span>} />
            </div>
          </Card>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="gold" size="lg" onClick={restart}>Try Again</Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/dashboard/support')}>Need help? Contact BEYLO Support</Button>
          </div>
        </div>
      </CheckoutPageShell>
    );
  }

  /* --------------------------- Instructions ---------------------------- */
  if (step === 'instructions' && quote && instructions) {
    const stage = CHECKOUT_STAGES[stageIndex];
    return (
      <CheckoutPageShell>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[20px] font-semibold text-navy-900 sm:text-[24px]">Complete Your Payment</h1>
            <Badge tone="gold" dot pulse>{stage.title}</Badge>
          </div>

          <Card className="p-5">
            <p className="text-[11.5px] uppercase tracking-[0.1em] text-navy-400">Send Exactly</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-[28px] font-semibold tabular-nums tracking-[-0.02em] text-navy-900 sm:text-[34px]">
                {num(instructions.cryptoAmount, quote.asset === 'BTC' ? 6 : quote.asset === 'ETH' ? 5 : 2)}
              </span>
              <span className="text-[16px] font-semibold text-navy-700">{quote.asset}</span>
            </div>
            <p className="mt-1 text-[13px] text-navy-400">Equivalent to {gbp(gbpAmount)} · {rateLine(quote.asset, quote.exchangeRate)}</p>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
              <div className="flex justify-center"><QRCode value={instructions.paymentUri} size={176} /></div>
              <div className="min-w-0">
                <p className="text-[11.5px] uppercase tracking-[0.1em] text-navy-400">Network</p>
                <p className="text-[14px] font-semibold text-navy-900">{quote.networkLabel}</p>
                <p className="mt-3 text-[11.5px] uppercase tracking-[0.1em] text-navy-400">To Address</p>
                <p className="break-all font-mono text-[13px] text-navy-900">{instructions.address}</p>
                <p className="mt-1 font-mono text-[12px] text-navy-400">{truncateMiddle(instructions.address, 8, 6)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton value={instructions.cryptoAmount.toString()} label="Copy Amount" />
                  <CopyButton value={instructions.address} label="Copy Address" variant="primary" />
                </div>
              </div>
            </div>

            <div className="mt-5"><NetworkWarning asset={quote.asset} network={quote.networkLabel} /></div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Countdown secondsLeft={secondsLeft} totalSeconds={QUOTE_SECONDS} label="Payment expires in" tone="amber" />
              <div className="text-right">
                <p className="text-[11.5px] uppercase tracking-[0.1em] text-navy-400">Payment ID</p>
                <p className="font-mono text-[13px] text-navy-900">{paymentId}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[13px] font-semibold text-navy-900">Payment status</p>
            <p className="mt-1 text-[12.5px] text-navy-400">{stage.message}</p>
            <div className="mt-4"><StatusStepper stages={CHECKOUT_STAGES.slice(0, 5).map((s) => ({ title: s.title, message: s.message }))} current={Math.min(stageIndex, 4)} /></div>
            <p className="mt-2 flex items-center gap-2 rounded-md bg-canvas px-3 py-2.5 text-[12px] text-navy-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-finsuccess" />
              Confirmation is provided by BEYLO’s payment provider — there is nothing else you need to do.
            </p>
          </Card>

          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={restart}><ArrowLeft className="h-4 w-4" /> Choose another asset</Button>
            <Button variant="outline" onClick={() => {
              setFailReason('Insufficient Amount');
              setPaymentStatus(paymentId, 'failed', {}, 'Insufficient Amount');
              setStep('failed');
            }}>
              <AlertTriangle className="h-4 w-4" /> Report a problem
            </Button>
          </div>
        </div>
      </CheckoutPageShell>
    );
  }

  /* ------------------------------- Quote ------------------------------- */
  if (step === 'quote' && quote) {
    return (
      <CheckoutPageShell>
        <div className="space-y-4">
          <button onClick={restart} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-400 hover:text-navy-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Change payment asset
          </button>
          <h1 className="text-[22px] font-semibold text-navy-900 sm:text-[26px]">Review Your Payment</h1>

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11.5px] uppercase tracking-[0.1em] text-navy-400">GBP Amount</p>
                <div className="mt-1"><Money size="lg">{gbp(gbpAmount)}</Money></div>
              </div>
              <Countdown secondsLeft={secondsLeft} totalSeconds={QUOTE_SECONDS} />
            </div>
            <div className="mt-4 divide-y divide-line border-t border-line pt-1">
              <QuoteRow label="Pay With" value={<span className="font-semibold">{quote.asset}</span>} />
              <QuoteRow label="Crypto Amount" value={fmtCrypto(quote.cryptoAmount, quote.asset)} strong />
              <QuoteRow label="Exchange Rate" value={rateLine(quote.asset, quote.exchangeRate)} hint="Provider-supplied live rate" />
              <QuoteRow label="Provider Fee" value={`Included (${gbp(quote.providerFeeGbp)})`} hint={quote.networkFeeNote} />
              <QuoteRow label="Network" value={quote.networkLabel} />
              <QuoteRow label="Quote Reference" value={<span className="font-mono text-[12.5px]">{quote.quoteId}</span>} />
            </div>
            <p className="mt-4 rounded-lg bg-canvas px-4 py-3 text-[12.5px] leading-relaxed text-navy-700">
              The exchange rate is locked for this payment until the timer expires. If it expires you can request a new
              quote at the prevailing provider rate.
            </p>
          </Card>

          <PrimaryCta onClick={continueToPayment} disabled={quoting}>
            {quoting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {quoting ? 'Preparing payment instructions…' : 'Continue to Payment'}
          </PrimaryCta>
        </div>
      </CheckoutPageShell>
    );
  }

  /* ------------------------------ Select ------------------------------- */
  return (
    <CheckoutPageShell>
      <div className="space-y-5">
        <MerchantSummary
          merchantName={merchantName}
          reference={reference}
          description={description}
          gbpAmount={gbpAmount}
        />

        <div>
          <h1 className="text-[18px] font-semibold text-navy-900">Choose how you would like to pay.</h1>
          <p className="mt-1 text-[13px] text-navy-400">
            Supported assets and networks are provided live by BEYLO’s payment infrastructure provider.
          </p>
        </div>

        {loadingAssets ? (
          <Card className="flex items-center justify-center gap-2 p-8 text-[13px] text-navy-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading supported payment assets…
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {assets.map((a) => (
              <AssetOption
                key={`${a.asset}-${a.network}`}
                asset={a}
                selected={selected?.asset === a.asset && selected?.network === a.network}
                onSelect={() => setSelected(a)}
              />
            ))}
          </div>
        )}

        {selected && (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11.5px] uppercase tracking-[0.1em] text-navy-400">Payment Network</p>
                <p className="text-[15px] font-semibold text-navy-900">{selected.networkLabel}</p>
                <p className="mt-0.5 text-[12.5px] text-navy-400">
                  {selected.confirmationsRequired} network confirmations required before funds are confirmed.
                </p>
              </div>
              <Badge tone="neutral">{selected.asset}</Badge>
            </div>
          </Card>
        )}

        <PrimaryCta disabled={!selected || quoting} onClick={() => selected && requestQuote(selected)}>
          {quoting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {quoting ? 'Requesting live quote…' : 'Continue to Quote'}
        </PrimaryCta>

        <p className="text-center text-[12px] text-navy-400">
          Payment ID <span className="font-mono">{paymentId}</span>
        </p>
      </div>
    </CheckoutPageShell>
  );
};

export default Checkout;
