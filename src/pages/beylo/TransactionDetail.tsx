import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, BackLink, PageHeader } from '@/components/beylo/AppShell';
import { Badge, Button, Card, CardHeader, CopyButton, Field, Modal, Money, PaymentStatusBadge, SettlementStatusBadge, EmptyState } from '@/components/beylo/primitives';
import { gbp, dateTime, crypto as fmtCrypto, num, truncateMiddle } from '@/lib/beylo/format';
import { PAYMENTS, AUDIT_LOGS, MERCHANT } from '@/data/beylo';
import { Check, Circle, Download, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const TransactionDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const payment = PAYMENTS.find((p) => p.paymentId === id);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  if (!payment) {
    return (
      <AppShell>
        <BackLink to="/dashboard/transactions" label="Back to transactions" />
        <Card><EmptyState title="Transaction not found" description={`No payment session matches ${id}.`} action={<Button onClick={() => navigate('/dashboard/transactions')}>View transactions</Button>} /></Card>
      </AppShell>
    );
  }

  const audit = AUDIT_LOGS.filter((l) => l.resource === payment.paymentId);
  const cancellable = ['awaiting_payment', 'payment_detected'].includes(payment.status);

  return (
    <AppShell title={`Transaction ${payment.paymentId}`}>
      <BackLink to="/dashboard/transactions" label="Back to transactions" />
      <PageHeader
        eyebrow={payment.reference}
        title={payment.description}
        description={`Created ${dateTime(payment.createdAt)} by ${payment.createdBy}`}
        actions={
          <>
            <CopyButton value={payment.paymentId} label="Copy ID" />
            <Button variant="outline" onClick={() => toast.success('Receipt PDF generated')}><Download className="h-4 w-4" /> Receipt</Button>
            {cancellable && <Button variant="danger" onClick={() => setCancelOpen(true)}><XCircle className="h-4 w-4" /> Cancel payment</Button>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Payment Overview" action={<div className="flex gap-2"><PaymentStatusBadge status={payment.status} /><SettlementStatusBadge status={payment.settlementStatus} /></div>} />
            <div className="border-b border-line px-5 py-5">
              <p className="text-[12px] uppercase tracking-[0.1em] text-navy-400">Payment Amount</p>
              <div className="mt-1"><Money size="lg">{gbp(payment.gbpAmount)}</Money> <span className="text-sm font-medium text-navy-400">GBP</span></div>
            </div>
            <dl className="grid grid-cols-1 gap-x-8 divide-y divide-line px-5 py-2 sm:grid-cols-2 sm:divide-y-0">
              <Field label="Transaction ID" value={payment.paymentId} mono />
              <Field label="Payment Reference" value={payment.reference} />
              <Field label="Created" value={dateTime(payment.createdAt)} />
              <Field label="Payment Asset" value={payment.asset} />
              <Field label="Crypto Amount" value={payment.cryptoAmount && payment.asset ? fmtCrypto(payment.cryptoAmount, payment.asset) : '—'} />
              <Field label="Payment Network" value={payment.network} />
              <Field label="Exchange Rate (provider)" value={payment.exchangeRate && payment.asset ? `1 ${payment.asset} = £${num(payment.exchangeRate, payment.asset === 'BTC' || payment.asset === 'ETH' ? 2 : 4)}` : '—'} />
              <Field label="Session Expiry" value={`${payment.expiryMinutes} minutes`} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Payment Timeline" description="Events sourced from provider webhooks and BEYLO ledger" />
            <ol className="px-5 py-5">
              {payment.timeline.map((ev, i) => {
                const done = Boolean(ev.timestamp);
                const failed = ev.label.toLowerCase().includes('failed') || ev.label.toLowerCase().includes('expired');
                return (
                  <li key={ev.label + i} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < payment.timeline.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-px ${done ? 'bg-navy-900/20' : 'bg-line'}`} />}
                    <span className={`relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border ${
                      failed ? 'border-finerror bg-finerror-soft text-finerror' : done ? 'border-finsuccess bg-finsuccess text-white' : 'border-line bg-white text-navy-300'
                    }`}>
                      {failed ? <XCircle className="h-3.5 w-3.5" /> : done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[13.5px] font-medium ${done ? 'text-navy-900' : 'text-navy-300'}`}>{ev.label}</p>
                      <p className="text-[12.5px] text-navy-400">{ev.timestamp ? dateTime(ev.timestamp) : 'Pending'}</p>
                      {ev.detail && <p className="mt-0.5 text-[12.5px] text-navy-400">{ev.detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Audit Trail" description="Append-only record of non-sensitive events" />
            <div className="divide-y divide-line">
              {(audit.length ? audit : [{ id: 'x', timestamp: payment.createdAt, actor: payment.createdBy, action: 'PAYMENT_CREATED', ip: '192.0.2.xxx', result: 'Success' as const, actorRole: '', resource: '' }]).map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div>
                    <p className="font-mono text-[12.5px] font-medium text-navy-900">{l.action}</p>
                    <p className="text-[12px] text-navy-400">{l.actor} · {dateTime(l.timestamp)} · IP {l.ip}</p>
                  </div>
                  <Badge tone={l.result === 'Success' ? 'success' : 'error'}>{l.result}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Customer Information" />
            <dl className="px-5 py-2">
              <Field label="Customer Name" value={payment.customerName} />
              <Field label="Customer Email" value={payment.customerEmail} />
              <Field label="Merchant" value={MERCHANT.tradingName} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Settlement" />
            <div className="px-5 py-4">
              <p className="text-[12px] uppercase tracking-[0.1em] text-navy-400">GBP Settlement Amount</p>
              <p className="mt-1 text-[24px] font-semibold tabular-nums text-navy-900">{payment.netGbp ? gbp(payment.netGbp) : '—'}</p>
            </div>
            <dl className="px-5 pb-2">
              <Field label="Fees" value={payment.feesGbp ? gbp(payment.feesGbp) : '—'} />
              <Field label="Settlement Status" value={<SettlementStatusBadge status={payment.settlementStatus} />} />
              <Field label="Settlement ID" value={payment.settlementId ? (
                <button className="inline-flex items-center gap-1 font-mono text-[13px] text-navy-900 underline-offset-2 hover:underline" onClick={() => navigate(`/dashboard/settlements/${payment.settlementId}`)}>
                  {payment.settlementId} <ExternalLink className="h-3 w-3" />
                </button>
              ) : '—'} />
              <Field label="Bank Account" value={MERCHANT.settlement.accountNumber} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Provider Information" description="BEYLO Sandbox Provider" />
            <dl className="px-5 py-2">
              <Field label="Provider Payment ID" value={payment.providerPaymentId} mono />
              <Field label="Provider Transaction ID" value={payment.providerTransactionId ?? '—'} mono />
              <Field label="Blockchain Reference" value={payment.txHash ? truncateMiddle(payment.txHash, 10, 8) : '—'} mono />
            </dl>
            <p className="border-t border-line px-5 py-3 text-[12px] text-navy-400">
              Provider credentials and signing secrets are held server-side and never exposed to the browser.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel payment session"
        description={`This will void the payment session for ${payment.paymentId}. Any quote issued by the provider will be released.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep session</Button>
            <Button variant="danger" onClick={() => { setCancelOpen(false); toast.success('Cancellation requested from provider'); }}>Cancel payment</Button>
          </>
        }
      >
        <p className="text-[13px] text-navy-700">
          If your customer has already broadcast a transaction, cancellation may not be possible. The provider remains the
          authoritative source of payment status.
        </p>
      </Modal>
    </AppShell>
  );
};

export default TransactionDetail;
