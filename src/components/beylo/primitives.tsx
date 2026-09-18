import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  PAYMENT_STATUS_LABEL,
  PaymentStatus,
  SETTLEMENT_STATUS_LABEL,
  SettlementStatus,
} from '@/lib/beylo/types';
import { copyToClipboard } from '@/lib/beylo/format';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------- Brand -------------------------------- */

export const BeyloMark: React.FC<{ className?: string; tone?: 'light' | 'dark' }> = ({
  className,
  tone = 'dark',
}) => (
  <svg viewBox="0 0 32 32" className={cn('h-7 w-7', className)} aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="8" fill={tone === 'dark' ? '#0B1526' : '#FFFFFF'} />
    <rect x="1" y="1" width="30" height="30" rx="8" fill="none" stroke="#C9A961" strokeWidth="1.2" />
    <path
      d="M11 9.5h6.4c2.4 0 3.9 1.2 3.9 3.2 0 1.4-.8 2.4-2 2.9 1.5.4 2.5 1.6 2.5 3.2 0 2.3-1.8 3.7-4.6 3.7H11V9.5Zm3.1 2.6v3h2.7c1 0 1.6-.6 1.6-1.5s-.6-1.5-1.6-1.5h-2.7Zm0 5.3v3.2h3c1.1 0 1.8-.6 1.8-1.6s-.7-1.6-1.8-1.6h-3Z"
      fill={tone === 'dark' ? '#FFFFFF' : '#0B1526'}
    />
  </svg>
);

export const BeyloLogo: React.FC<{ tone?: 'light' | 'dark'; to?: string; subtitle?: string }> = ({
  tone = 'dark',
  to = '/',
  subtitle,
}) => (
  <Link to={to} className="flex items-center gap-2.5 group">
    <BeyloMark tone={tone === 'light' ? 'light' : 'dark'} />
    <span className="leading-none">
      <span
        className={cn(
          'block text-[17px] font-semibold tracking-[0.22em]',
          tone === 'light' ? 'text-white' : 'text-navy-900',
        )}
      >
        BEYLO
      </span>
      {subtitle && (
        <span
          className={cn(
            'mt-1 block text-[10px] font-medium uppercase tracking-[0.18em]',
            tone === 'light' ? 'text-navy-300' : 'text-navy-400',
          )}
        >
          {subtitle}
        </span>
      )}
    </span>
  </Link>
);

/* ------------------------------ Buttons ------------------------------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2';

const variants: Record<string, string> = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800 shadow-sm',
  gold: 'bg-gold-500 text-navy-900 hover:bg-gold-400 shadow-sm font-semibold',
  outline: 'border border-line bg-white text-navy-900 hover:bg-canvas hover:border-navy-300',
  ghost: 'text-navy-700 hover:bg-navy-900/5',
  danger: 'bg-finerror text-white hover:bg-finerror/90',
};

const sizes: Record<string, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

export const Button: React.FC<BtnProps> = ({ variant = 'primary', size = 'md', className, ...rest }) => (
  <button className={cn(btnBase, variants[variant], sizes[size], className)} {...rest} />
);

/* ------------------------------- Cards -------------------------------- */

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(13,22,38,0.04)]', className)}>
    {children}
  </div>
);

export const CardHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, action, className }) => (
  <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
    <div>
      <h3 className="text-[15px] font-semibold text-navy-900">{title}</h3>
      {description && <p className="mt-0.5 text-[13px] text-navy-400">{description}</p>}
    </div>
    {action}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-400', className)}>{children}</p>
);

export const Field: React.FC<{ label: string; value?: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="py-2.5">
    <dt className="text-[12px] uppercase tracking-[0.08em] text-navy-400">{label}</dt>
    <dd className={cn('mt-1 text-sm text-navy-900', mono && 'font-mono text-[13px]')}>{value ?? '—'}</dd>
  </div>
);

/* ------------------------------- Inputs -------------------------------- */

export const Label: React.FC<{ children: React.ReactNode; htmlFor?: string; hint?: string }> = ({
  children,
  htmlFor,
  hint,
}) => (
  <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-navy-800">
    <span>{children}</span>
    {hint && <span className="text-[12px] font-normal text-navy-400">{hint}</span>}
  </label>
);

const controlCls =
  'w-full rounded-md border border-line bg-white px-3 text-sm text-navy-900 placeholder:text-navy-300 transition focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-900/10';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...rest }) => (
  <input className={cn(controlCls, 'h-10', className)} {...rest} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...rest }) => (
  <select className={cn(controlCls, 'h-10 appearance-none bg-white pr-8', className)} {...rest}>
    {children}
  </select>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...rest }) => (
  <textarea className={cn(controlCls, 'py-2.5', className)} {...rest} />
);

/* ------------------------------- Badges -------------------------------- */

const badgeTone: Record<string, string> = {
  neutral: 'bg-navy-900/5 text-navy-700 border-navy-900/10',
  info: 'bg-fininfo-soft text-fininfo border-fininfo/20',
  success: 'bg-finsuccess-soft text-finsuccess border-finsuccess/20',
  warn: 'bg-finwarn-soft text-finwarn border-finwarn/20',
  error: 'bg-finerror-soft text-finerror border-finerror/20',
  gold: 'bg-gold-100 text-gold-700 border-gold-500/30',
};

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: keyof typeof badgeTone;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}> = ({ children, tone = 'neutral', dot, pulse, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-medium',
      badgeTone[tone],
      className,
    )}
  >
    {dot && (
      <span className="relative flex h-1.5 w-1.5">
        {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    )}
    {children}
  </span>
);

const PAYMENT_TONE: Record<PaymentStatus, keyof typeof badgeTone> = {
  awaiting_payment: 'warn',
  payment_detected: 'info',
  confirming: 'info',
  confirmed: 'success',
  completed: 'success',
  expired: 'neutral',
  failed: 'error',
  cancelled: 'neutral',
};

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => (
  <Badge tone={PAYMENT_TONE[status]} dot pulse={status === 'awaiting_payment' || status === 'confirming'}>
    {PAYMENT_STATUS_LABEL[status]}
  </Badge>
);

const SETTLEMENT_TONE: Record<SettlementStatus, keyof typeof badgeTone> = {
  not_started: 'neutral',
  conversion_processing: 'info',
  settlement_pending: 'warn',
  processing: 'info',
  settled: 'success',
  failed: 'error',
};

export const SettlementStatusBadge: React.FC<{ status: SettlementStatus }> = ({ status }) => (
  <Badge tone={SETTLEMENT_TONE[status]}>{SETTLEMENT_STATUS_LABEL[status]}</Badge>
);

/* ------------------------------ Copy button ---------------------------- */

export const CopyButton: React.FC<{
  value: string;
  label?: string;
  variant?: 'primary' | 'gold' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ value, label = 'Copy', variant = 'outline', size = 'sm', className }) => {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={async () => {
        const ok = await copyToClipboard(value);
        setDone(ok);
        toast[ok ? 'success' : 'error'](ok ? `${label} copied to clipboard` : 'Unable to copy');
        window.setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
};

/* ------------------------------ Misc ----------------------------------- */

export const Money: React.FC<{ children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({
  children,
  size = 'md',
  className,
}) => {
  const map = {
    sm: 'text-[15px]',
    md: 'text-[22px]',
    lg: 'text-[32px] md:text-[38px]',
    xl: 'text-[38px] md:text-[52px]',
  };
  return (
    <span
      className={cn('font-semibold tracking-[-0.02em] text-navy-900 tabular-nums', map[size], className)}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {children}
    </span>
  );
};

export const SecureFooterNote: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center justify-center gap-2 text-[12px] text-navy-400', className)}>
    <ShieldCheck className="h-3.5 w-3.5 text-finsuccess" />
    Payment securely processed through BEYLO · PCI-grade encryption
  </div>
);

export const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-canvas">
      <ShieldCheck className="h-5 w-5 text-navy-300" />
    </div>
    <p className="text-sm font-semibold text-navy-900">{title}</p>
    {description && <p className="mt-1 max-w-sm text-[13px] text-navy-400">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/* ------------------------------ Modal ---------------------------------- */

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, onClose, title, description, children, footer, width = 'max-w-lg' }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-navy-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className={cn(
          'animate-slide-in w-full rounded-t-2xl border border-line bg-white shadow-2xl sm:rounded-xl',
          width,
        )}
      >
        {(title || description) && (
          <div className="border-b border-line px-5 py-4 sm:px-6">
            {title && <h3 className="text-base font-semibold text-navy-900">{title}</h3>}
            {description && <p className="mt-1 text-[13px] text-navy-400">{description}</p>}
          </div>
        )}
        <div className="px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
};
