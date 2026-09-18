import React from 'react';
import { cn } from '@/lib/utils';
import { Badge, BeyloMark, Button, Money } from '@/components/beylo/primitives';
import { gbp, mmss, num } from '@/lib/beylo/format';
import { CryptoAsset } from '@/lib/beylo/types';
import { Lock, ShieldCheck, Check, Circle, Loader2 } from 'lucide-react';

/* ----------------------------- Chrome ---------------------------------- */

export const CheckoutHeader: React.FC = () => (
  <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:h-16">
      <div className="flex items-center gap-2.5">
        <BeyloMark />
        <span className="text-[16px] font-semibold tracking-[0.22em] text-navy-900">BEYLO</span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-finsuccess/20 bg-finsuccess-soft px-2.5 py-1 text-[12px] font-medium text-finsuccess">
        <Lock className="h-3.5 w-3.5" /> Secure Payment
      </span>
    </div>
  </header>
);

export const CheckoutFooter: React.FC = () => (
  <footer className="mx-auto max-w-3xl px-4 py-8 text-center">
    <p className="flex items-center justify-center gap-2 text-[12.5px] text-navy-400">
      <ShieldCheck className="h-4 w-4 text-finsuccess" />
      Payment securely processed through BEYLO
    </p>
    <p className="mx-auto mt-2 max-w-md text-[11.5px] leading-relaxed text-navy-300">
      BEYLO Payments Ltd, registered in England &amp; Wales. Cryptocurrency processing, conversion and GBP settlement are
      performed by BEYLO’s regulated payment infrastructure provider.
    </p>
  </footer>
);

export const MerchantSummary: React.FC<{
  merchantName: string;
  reference: string;
  description: string;
  gbpAmount: number;
  compact?: boolean;
}> = ({ merchantName, reference, description, gbpAmount, compact }) => (
  <div className={cn('rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(13,22,38,0.04)]', compact && 'p-4')}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-400">Merchant</p>
        <p className="mt-1 truncate text-[15px] font-semibold text-navy-900">{merchantName}</p>
      </div>
      <Badge tone="gold">Verified merchant</Badge>
    </div>
    <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
      <div>
        <dt className="text-[11.5px] uppercase tracking-[0.08em] text-navy-400">Payment Reference</dt>
        <dd className="mt-0.5 text-[13.5px] font-medium text-navy-900">{reference}</dd>
      </div>
      <div>
        <dt className="text-[11.5px] uppercase tracking-[0.08em] text-navy-400">Product</dt>
        <dd className="mt-0.5 text-[13.5px] font-medium text-navy-900">{description}</dd>
      </div>
    </dl>
    <div className="mt-4 rounded-lg bg-canvas px-4 py-4">
      <p className="text-[11.5px] uppercase tracking-[0.1em] text-navy-400">Amount Due</p>
      <div className="mt-1 flex items-baseline gap-2">
        <Money size="xl">{gbp(gbpAmount)}</Money>
        <span className="text-[13px] font-medium text-navy-400">GBP</span>
      </div>
    </div>
  </div>
);

/* --------------------------- Asset selection --------------------------- */

const ASSET_GLYPH: Record<string, string> = { USDC: 'U', USDT: 'T', BTC: '₿', ETH: 'Ξ', SOL: 'S' };

export const AssetOption: React.FC<{
  asset: CryptoAsset;
  selected: boolean;
  onSelect: () => void;
}> = ({ asset, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition',
      selected ? 'border-navy-900 bg-navy-900/[0.03] ring-2 ring-navy-900/10' : 'border-line bg-white hover:border-navy-300',
    )}
  >
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold',
        asset.type === 'stablecoin' ? 'bg-fininfo-soft text-fininfo' : 'bg-gold-100 text-gold-700',
      )}
    >
      {ASSET_GLYPH[asset.asset] ?? asset.asset[0]}
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="text-[14.5px] font-semibold text-navy-900">{asset.asset}</span>
        {asset.type === 'stablecoin' && <Badge tone="neutral" className="px-1.5 py-0.5 text-[10.5px]">Stablecoin</Badge>}
      </span>
      <span className="mt-0.5 block text-[12.5px] text-navy-400">
        {asset.name} · {asset.networkLabel} network
      </span>
    </span>
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
        selected ? 'border-navy-900 bg-navy-900 text-white' : 'border-line',
      )}
    >
      {selected && <Check className="h-3 w-3" />}
    </span>
  </button>
);

/* ------------------------------ Countdown ------------------------------ */

export const Countdown: React.FC<{
  secondsLeft: number;
  totalSeconds: number;
  label?: string;
  tone?: 'navy' | 'amber';
}> = ({ secondsLeft, totalSeconds, label = 'Quote expires in', tone = 'navy' }) => {
  const pct = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const r = 26;
  const c = 2 * Math.PI * r;
  const warn = secondsLeft <= 60;
  const stroke = warn ? '#9B2C2C' : tone === 'amber' ? '#9A6B12' : '#1B2C45';
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#E6E3DB" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={r} fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
      </div>
      <div>
        <p className="text-[11.5px] uppercase tracking-[0.1em] text-navy-400">{label}</p>
        <p className={cn('text-[26px] font-semibold tabular-nums', warn ? 'text-finerror' : 'text-navy-900')}>{mmss(secondsLeft)}</p>
      </div>
    </div>
  );
};

/* ---------------------------- Status stepper --------------------------- */

export const StatusStepper: React.FC<{ stages: { title: string; message: string }[]; current: number }> = ({
  stages,
  current,
}) => (
  <ol className="space-y-0">
    {stages.map((s, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <li key={s.title} className="relative flex gap-3 pb-5 last:pb-0">
          {i < stages.length - 1 && (
            <span className={cn('absolute left-[13px] top-7 h-full w-px', done ? 'bg-finsuccess/40' : 'bg-line')} />
          )}
          <span
            className={cn(
              'relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border',
              done ? 'border-finsuccess bg-finsuccess text-white' : active ? 'border-navy-900 bg-white text-navy-900' : 'border-line bg-white text-navy-300',
            )}
          >
            {done ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-2 w-2" />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn('text-[13.5px] font-semibold', done || active ? 'text-navy-900' : 'text-navy-300')}>{s.title}</p>
            {active && <p className="mt-0.5 text-[12.5px] text-navy-400">{s.message}</p>}
          </div>
        </li>
      );
    })}
  </ol>
);

/* --------------------------- Rate summary row -------------------------- */

export const QuoteRow: React.FC<{ label: string; value: React.ReactNode; strong?: boolean; hint?: string }> = ({
  label,
  value,
  strong,
  hint,
}) => (
  <div className="flex items-start justify-between gap-4 py-2.5">
    <div>
      <p className={cn('text-[13px]', strong ? 'font-medium text-navy-900' : 'text-navy-400')}>{label}</p>
      {hint && <p className="text-[11.5px] text-navy-300">{hint}</p>}
    </div>
    <p className={cn('text-right tabular-nums', strong ? 'text-[15px] font-semibold text-navy-900' : 'text-[13.5px] text-navy-900')}>{value}</p>
  </div>
);

export const rateLine = (asset: string, rate: number): string =>
  `1 ${asset} = £${num(rate, asset === 'BTC' || asset === 'ETH' || asset === 'SOL' ? 2 : 4)}`;

export const NetworkWarning: React.FC<{ asset: string; network: string }> = ({ asset, network }) => (
  <div className="rounded-lg border border-finwarn/30 bg-finwarn-soft px-4 py-3">
    <p className="text-[12.5px] font-semibold text-finwarn">Send only {asset} on the {network} network</p>
    <p className="mt-1 text-[12px] leading-relaxed text-navy-700">
      Sending another asset or using an unsupported network may result in permanent loss of funds.
    </p>
  </div>
);

export const CheckoutPageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-canvas">
    <CheckoutHeader />
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</main>
    <CheckoutFooter />
  </div>
);

export const PrimaryCta: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...rest }) => (
  <Button variant="gold" size="lg" className="w-full" {...rest}>
    {children}
  </Button>
);
