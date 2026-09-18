import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, BackLink, PageHeader } from '@/components/beylo/AppShell';
import { Badge, Button, Card, CardHeader, Field, Input, Label, Modal, Money, PaymentStatusBadge, Select, SettlementStatusBadge, EmptyState, CopyButton } from '@/components/beylo/primitives';
import { VolumeBarChart, AssetDistributionChart } from '@/components/beylo/charts';
import { gbp, dateShort, dateTime, timeOnly, crypto as fmtCrypto } from '@/lib/beylo/format';
import { ADMIN_MERCHANTS, ADMIN_USERS, AUDIT_LOGS, PAYMENTS, PLATFORM_SERIES, PROVIDER_HEALTH, SETTLEMENTS, WEBHOOK_EVENTS } from '@/data/beylo';
import { MerchantStatus, VerificationStatus } from '@/lib/beylo/types';
import { Activity, AlertTriangle, Ban, CheckCircle2, RefreshCw, Search, ShieldCheck, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const MERCHANT_TONE: Record<MerchantStatus, 'success' | 'warn' | 'error' | 'neutral'> = {
  active: 'success', pending: 'warn', restricted: 'warn', suspended: 'error',
};
const VERIF_LABEL: Record<VerificationStatus, string> = {
  pending_review: 'Pending Review', information_required: 'Information Required', verified: 'Verified', rejected: 'Rejected',
};
const VERIF_TONE: Record<VerificationStatus, 'success' | 'warn' | 'error' | 'neutral'> = {
  pending_review: 'warn', information_required: 'warn', verified: 'success', rejected: 'error',
};

const Kpi: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <Card className="p-5">
    <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-navy-400">{label}</p>
    <div className="mt-2"><Money size="md">{value}</Money></div>
    {note && <p className="mt-1.5 text-[12.5px] text-navy-400">{note}</p>}
  </Card>
);

/* ----------------------------- Overview -------------------------------- */

export const AdminOverview: React.FC = () => {
  const navigate = useNavigate();
  const active = ADMIN_MERCHANTS.filter((m) => m.status === 'active').length;
  const volume = ADMIN_MERCHANTS.reduce((a, m) => a + m.volumeGbp, 0);

  return (
    <AppShell variant="admin" title="Platform operations overview">
      <PageHeader
        eyebrow="Administration"
        title="Platform Overview"
        description="System-wide payment, settlement and provider activity."
        actions={<Button variant="outline" onClick={() => navigate('/admin/provider-health')}><Activity className="h-4 w-4" /> Provider health</Button>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Total Merchants" value={String(ADMIN_MERCHANTS.length)} note={`${active} active · 1 pending verification`} />
        <Kpi label="Payment Volume (30d)" value={gbp(volume, false)} note="+14.8% vs previous period" />
        <Kpi label="Payments Today" value="37" note="£612,400 processed" />
        <Kpi label="Pending Settlements" value={gbp(SETTLEMENTS.filter((s) => s.status !== 'settled').reduce((a, s) => a + s.netGbp, 0), false)} note="3 batches queued" />
        <Kpi label="Payment Success Rate" value="94.1%" note="Rolling 30 days" />
        <Kpi label="Active Merchants" value={String(active)} note="Trading in the last 30 days" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Platform Payment Volume" description="Aggregated GBP volume across all merchants" />
          <div className="px-3 py-4"><VolumeBarChart data={PLATFORM_SERIES} /></div>
        </Card>
        <Card>
          <CardHeader title="Payments by Asset" />
          <div className="p-5"><AssetDistributionChart height={190} /></div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Recent Webhook Events" action={<Button size="sm" variant="outline" onClick={() => navigate('/admin/webhooks')}>Open</Button>} />
          <div className="divide-y divide-line">
            {WEBHOOK_EVENTS.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[12.5px] font-medium text-navy-900">{e.type}</p>
                  <p className="text-[12px] text-navy-400">{e.paymentId} · {timeOnly(e.receivedAt)}</p>
                </div>
                <Badge tone={e.status === 'Processed' ? 'success' : e.status === 'Failed' ? 'error' : 'neutral'}>{e.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Merchants Requiring Attention" action={<Button size="sm" variant="outline" onClick={() => navigate('/admin/merchants')}>Open</Button>} />
          <div className="divide-y divide-line">
            {ADMIN_MERCHANTS.filter((m) => m.status !== 'active').map((m) => (
              <button key={m.id} onClick={() => navigate(`/admin/merchants/${m.id}`)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-canvas/70">
                <div>
                  <p className="text-[13.5px] font-medium text-navy-900">{m.tradingName}</p>
                  <p className="text-[12px] text-navy-400">{m.id} · {m.industry}</p>
                </div>
                <Badge tone={MERCHANT_TONE[m.status]} dot>{m.status}</Badge>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

/* ----------------------------- Merchants ------------------------------- */

export const AdminMerchants: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const rows = ADMIN_MERCHANTS.filter((m) => {
    if (q && !`${m.id} ${m.legalName} ${m.tradingName} ${m.industry}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== 'all' && m.status !== status) return false;
    return true;
  });

  return (
    <AppShell variant="admin" title="Merchant management">
      <PageHeader eyebrow="Administration" title="Merchants" description={`${rows.length} merchant accounts on the platform`} />
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search merchants by name, ID or industry" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="restricted">Restricted</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState title="No merchants match this search" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                  <th className="px-5 py-3 font-medium">Merchant ID</th>
                  <th className="px-5 py-3 font-medium">Business Name</th>
                  <th className="px-5 py-3 font-medium">Industry</th>
                  <th className="px-5 py-3 font-medium">Onboarding</th>
                  <th className="px-5 py-3 font-medium">Verification</th>
                  <th className="px-5 py-3 text-right font-medium">Payment Volume</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} onClick={() => navigate(`/admin/merchants/${m.id}`)} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-canvas/70">
                    <td className="px-5 py-3.5 font-mono text-[12.5px] font-medium text-navy-900">{m.id}</td>
                    <td className="px-5 py-3.5"><p className="font-medium text-navy-900">{m.tradingName}</p><p className="text-[12px] text-navy-400">{m.legalName}</p></td>
                    <td className="px-5 py-3.5 text-[13px] text-navy-700">{m.industry}</td>
                    <td className="px-5 py-3.5"><Badge tone={m.onboarding === 'Complete' ? 'success' : 'warn'}>{m.onboarding}</Badge></td>
                    <td className="px-5 py-3.5"><Badge tone={VERIF_TONE[m.verification]}>{VERIF_LABEL[m.verification]}</Badge></td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-900">{gbp(m.volumeGbp, false)}</td>
                    <td className="px-5 py-3.5"><Badge tone={MERCHANT_TONE[m.status]} dot>{m.status}</Badge></td>
                    <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateShort(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
};

export const AdminMerchantDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const merchant = ADMIN_MERCHANTS.find((m) => m.id === id);
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [status, setStatus] = React.useState<MerchantStatus | undefined>(merchant?.status);

  if (!merchant) {
    return (
      <AppShell variant="admin">
        <BackLink to="/admin/merchants" label="Back to merchants" />
        <Card><EmptyState title="Merchant not found" action={<Button onClick={() => navigate('/admin/merchants')}>View merchants</Button>} /></Card>
      </AppShell>
    );
  }

  const suspend = () => {
    if (reason.trim().length < 8) { toast.error('A suspension reason of at least 8 characters is required'); return; }
    setStatus('suspended');
    setSuspendOpen(false);
    toast.success(`${merchant.tradingName} suspended · reason recorded in audit log`);
    setReason('');
  };

  return (
    <AppShell variant="admin" title={`Merchant ${merchant.id}`}>
      <BackLink to="/admin/merchants" label="Back to merchants" />
      <PageHeader
        eyebrow={merchant.id}
        title={merchant.tradingName}
        description={`${merchant.legalName} · ${merchant.industry} · onboarded ${dateShort(merchant.createdAt)}`}
        actions={
          <>
            <Badge tone={MERCHANT_TONE[status ?? merchant.status]} dot>{status ?? merchant.status}</Badge>
            {status === 'suspended' ? (
              <Button variant="outline" onClick={() => { setStatus('active'); toast.success('Merchant reactivated'); }}><CheckCircle2 className="h-4 w-4" /> Activate merchant</Button>
            ) : (
              <Button variant="danger" onClick={() => setSuspendOpen(true)}><Ban className="h-4 w-4" /> Suspend merchant</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Business Information" />
          <dl className="grid grid-cols-1 gap-x-8 px-5 py-2 sm:grid-cols-2">
            <Field label="Legal name" value={merchant.legalName} />
            <Field label="Trading name" value={merchant.tradingName} />
            <Field label="Registration number" value={merchant.registrationNumber} mono />
            <Field label="Industry" value={merchant.industry} />
            <Field label="Country" value={merchant.country} />
            <Field label="Website" value={merchant.website} />
            <Field label="Registered address" value={merchant.address} />
            <Field label="Settlement account" value={merchant.bankAccount} />
          </dl>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Representative" />
            <dl className="px-5 py-2">
              <Field label="Name" value={merchant.representative.name} />
              <Field label="Job title" value={merchant.representative.jobTitle} />
              <Field label="Email" value={merchant.representative.email} />
              <Field label="Phone" value={merchant.representative.phone} />
            </dl>
          </Card>
          <Card>
            <CardHeader title="Verification" action={<Badge tone={VERIF_TONE[merchant.verification]}>{VERIF_LABEL[merchant.verification]}</Badge>} />
            <div className="px-5 py-4 text-[12.5px] text-navy-400">
              Onboarding status: {merchant.onboarding}. KYB/KYC checks are performed by BEYLO’s verification provider; only
              outcomes are stored on the platform.
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Lifetime Volume" value={gbp(merchant.volumeGbp, false)} />
        <Kpi label="Payments" value={String(merchant.payments)} note="Successful sessions" />
        <Kpi label="Avg. Transaction" value={gbp(merchant.payments ? merchant.volumeGbp / merchant.payments : 0, false)} />
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Transaction Activity" description="Most recent payment sessions" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                <th className="px-5 py-3 font-medium">Transaction ID</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 text-right font-medium">GBP</th>
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Settlement</th>
              </tr>
            </thead>
            <tbody>
              {PAYMENTS.slice(0, 6).map((p) => (
                <tr key={p.paymentId} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-navy-900">{p.paymentId}</td>
                  <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateTime(p.createdAt)}</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-900">{gbp(p.gbpAmount)}</td>
                  <td className="px-5 py-3.5">{p.asset ? <Badge>{p.asset}</Badge> : '—'}</td>
                  <td className="px-5 py-3.5"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-5 py-3.5"><SettlementStatusBadge status={p.settlementStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Audit History" description="Administrative and merchant actions" />
        <div className="divide-y divide-line">
          {AUDIT_LOGS.slice(0, 6).map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <div>
                <p className="font-mono text-[12.5px] font-medium text-navy-900">{l.action}</p>
                <p className="text-[12px] text-navy-400">{l.actor} · {dateTime(l.timestamp)} · {l.resource}</p>
              </div>
              <Badge tone={l.result === 'Success' ? 'success' : 'error'}>{l.result}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title="Suspend Merchant"
        description={`Are you sure you want to suspend ${merchant.tradingName}?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={suspend}><Ban className="h-4 w-4" /> Suspend merchant</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-finwarn/30 bg-finwarn-soft px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-finwarn" />
            <p className="text-[12.5px] text-navy-700">
              Suspension immediately blocks new payment creation. In-flight payments will continue to be tracked and
              settled. This action is recorded in the immutable audit log.
            </p>
          </div>
          <div>
            <Label>Reason for suspension (required)</Label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Risk review — unusual transaction pattern requiring compliance sign-off" className="w-full rounded-md border border-line px-3 py-2.5 text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-900/10" />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
};

/* ------------------------- Payments & Settlements ---------------------- */

export const AdminPayments: React.FC = () => {
  const [q, setQ] = React.useState('');
  const rows = PAYMENTS.filter((p) => `${p.paymentId} ${p.reference} ${p.merchantName}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <AppShell variant="admin" title="Platform payments">
      <PageHeader eyebrow="Administration" title="Payments" description="All payment sessions created across BEYLO merchants." />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by payment ID, reference or merchant" className="pl-9" />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                <th className="px-5 py-3 font-medium">Payment ID</th>
                <th className="px-5 py-3 font-medium">Merchant</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 text-right font-medium">GBP</th>
                <th className="px-5 py-3 text-right font-medium">Crypto</th>
                <th className="px-5 py-3 font-medium">Provider Payment</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.paymentId} className="border-b border-line/70 last:border-0 hover:bg-canvas/70">
                  <td className="px-5 py-3.5 font-mono text-[12.5px] font-medium text-navy-900">{p.paymentId}</td>
                  <td className="px-5 py-3.5 text-[13px] text-navy-700">{p.merchantName}</td>
                  <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateTime(p.createdAt)}</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-900">{gbp(p.gbpAmount)}</td>
                  <td className="px-5 py-3.5 text-right text-[12.5px] tabular-nums text-navy-700">{p.cryptoAmount && p.asset ? fmtCrypto(p.cryptoAmount, p.asset) : '—'}</td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-navy-400">{p.providerPaymentId}</td>
                  <td className="px-5 py-3.5"><PaymentStatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
};

export const AdminSettlements: React.FC = () => (
  <AppShell variant="admin" title="Platform settlements">
    <PageHeader eyebrow="Administration" title="Settlements" description="GBP settlement batches across all merchants." />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Kpi label="Pending Settlement" value={gbp(196409, false)} note="1 batch" />
      <Kpi label="Processing" value={gbp(24925, false)} note="1 batch" />
      <Kpi label="Settled This Month" value={gbp(713797, false)} note="3 batches" />
    </div>
    <Card className="mt-6 overflow-hidden">
      <CardHeader title="Settlement Batches" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
              <th className="px-5 py-3 font-medium">Settlement ID</th>
              <th className="px-5 py-3 font-medium">Merchant</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 text-right font-medium">Gross</th>
              <th className="px-5 py-3 text-right font-medium">Fees</th>
              <th className="px-5 py-3 text-right font-medium">Net</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {SETTLEMENTS.map((s) => (
              <tr key={s.settlementId} className="border-b border-line/70 last:border-0 hover:bg-canvas/70">
                <td className="px-5 py-3.5 font-mono text-[12.5px] font-medium text-navy-900">{s.settlementId}</td>
                <td className="px-5 py-3.5 text-[13px] text-navy-700">{s.merchantName}</td>
                <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateShort(s.date)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{gbp(s.grossGbp)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-navy-400">{gbp(s.feesGbp)}</td>
                <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-900">{gbp(s.netGbp)}</td>
                <td className="px-5 py-3.5"><SettlementStatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </AppShell>
);

/* ------------------------------ Webhooks -------------------------------- */

export const AdminWebhooks: React.FC = () => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [retryOpen, setRetryOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const rows = WEBHOOK_EVENTS.filter((e) => filter === 'all' || e.status === filter);
  const selected = WEBHOOK_EVENTS.find((e) => e.id === selectedId);

  return (
    <AppShell variant="admin" title="Provider webhook monitoring">
      <PageHeader
        eyebrow="Operations"
        title="Webhook Events"
        description="Inbound provider events, signature verification and processing outcomes."
        actions={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
            <option value="all">All statuses</option>
            <option value="Processed">Processed</option>
            <option value="Duplicate Ignored">Duplicate Ignored</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </Select>
        }
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                <th className="px-5 py-3 font-medium">Event ID</th>
                <th className="px-5 py-3 font-medium">Provider</th>
                <th className="px-5 py-3 font-medium">Event Type</th>
                <th className="px-5 py-3 font-medium">Transaction</th>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Processing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} onClick={() => setSelectedId(e.id)} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-canvas/70">
                  <td className="px-5 py-3.5 font-mono text-[12.5px] font-medium text-navy-900">{e.id}</td>
                  <td className="px-5 py-3.5 text-[13px] text-navy-700">{e.provider}</td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-navy-900">{e.type}</td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-navy-700">{e.paymentId}</td>
                  <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateTime(e.receivedAt)}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={e.status === 'Processed' ? 'success' : e.status === 'Failed' ? 'error' : e.status === 'Pending' ? 'warn' : 'neutral'}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        width="max-w-2xl"
        title={selected ? `${selected.type}` : ''}
        description={selected ? `${selected.id} · ${selected.provider}` : ''}
        footer={
          selected?.status === 'Failed' ? (
            <>
              <Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button>
              <Button variant="primary" onClick={() => setRetryOpen(true)}><RefreshCw className="h-4 w-4" /> Retry Processing</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Transaction" value={selected.paymentId} mono />
              <Field label="Received" value={dateTime(selected.receivedAt)} />
              <Field label="Signature" value={<Badge tone={selected.signatureVerified ? 'success' : 'error'}><ShieldCheck className="h-3.5 w-3.5" /> {selected.signatureVerified ? 'Verified' : 'Invalid'}</Badge>} />
              <Field label="Delivery attempts" value={String(selected.attempts)} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] uppercase tracking-[0.1em] text-navy-400">Sanitised payload</p>
                <CopyButton value={JSON.stringify(selected.payload, null, 2)} label="Copy JSON" />
              </div>
              <pre className="max-h-64 overflow-auto rounded-lg border border-line bg-navy-950 p-4 font-mono text-[12px] leading-relaxed text-navy-300">
{JSON.stringify(selected.payload, null, 2)}
              </pre>
              <p className="mt-2 text-[12px] text-navy-400">Authentication secrets and signing headers are redacted from stored payloads.</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={retryOpen}
        onClose={() => setRetryOpen(false)}
        title="Retry internal processing"
        description="This re-runs BEYLO's internal handler for this event. It does not re-request the event from the provider."
        footer={
          <>
            <Button variant="outline" onClick={() => setRetryOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setRetryOpen(false); setSelectedId(null); toast.success('Event re-queued for processing'); }}>Confirm retry</Button>
          </>
        }
      >
        <p className="text-[13px] text-navy-700">Processing is idempotent — duplicate applications of the same event are ignored.</p>
      </Modal>
    </AppShell>
  );
};

/* ------------------------------ Audit logs ------------------------------ */

export const AdminAudit: React.FC = () => {
  const [q, setQ] = React.useState('');
  const [result, setResult] = React.useState('all');
  const rows = AUDIT_LOGS.filter((l) => {
    if (q && !`${l.actor} ${l.action} ${l.resource}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (result !== 'all' && l.result !== result) return false;
    return true;
  });

  return (
    <AppShell variant="admin" title="Immutable audit log">
      <PageHeader eyebrow="Compliance" title="Audit Logs" description="Append-only record of platform and merchant actions. Entries cannot be edited or deleted." />
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by actor, action or resource" className="pl-9" />
          </div>
          <Select value={result} onChange={(e) => setResult(e.target.value)} className="sm:w-40">
            <option value="all">All results</option>
            <option value="Success">Success</option>
            <option value="Failure">Failure</option>
          </Select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">Actor</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Resource</th>
                <th className="px-5 py-3 font-medium">IP Address</th>
                <th className="px-5 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3.5 text-[12.5px] tabular-nums text-navy-700">{dateTime(l.timestamp)}:{new Date(l.timestamp).getSeconds().toString().padStart(2, '0')}</td>
                  <td className="px-5 py-3.5"><p className="text-[13px] font-medium text-navy-900">{l.actor}</p><p className="text-[12px] text-navy-400">{l.actorRole}</p></td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-navy-900">{l.action}</td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-navy-700">{l.resource}</td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-navy-400">{l.ip}</td>
                  <td className="px-5 py-3.5"><Badge tone={l.result === 'Success' ? 'success' : 'error'}>{l.result}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
};

/* --------------------------- Provider health ---------------------------- */

export const AdminProviderHealth: React.FC = () => (
  <AppShell variant="admin" title="Provider health">
    <PageHeader eyebrow="Operations" title="Provider Health" description="Availability of the configured payment infrastructure provider (BEYLO Sandbox Provider)." />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2 overflow-hidden">
        <CardHeader title="Service Status" action={<Badge tone="warn" dot pulse>1 degraded</Badge>} />
        <div className="divide-y divide-line">
          {PROVIDER_HEALTH.map((s) => (
            <div key={s.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-[13.5px] font-medium text-navy-900">{s.name}</p>
                <p className="text-[12px] text-navy-400">Latency {s.latency} · Uptime {s.uptime}</p>
              </div>
              <Badge tone={s.status === 'Operational' ? 'success' : 'warn'} dot>{s.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-900"><Building2 className="h-4 w-4 text-gold-600" /> Provider abstraction</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-navy-400">
          BEYLO integrates through a generic <span className="font-mono">PaymentProvider</span> interface
          (createPayment, getSupportedAssets, createQuote, getPaymentInstructions, getPaymentStatus, cancelPayment,
          getSettlementStatus, verifyWebhook, processWebhook). The production processor can be swapped without UI changes.
        </p>
        <div className="mt-4 space-y-2 border-t border-line pt-4 text-[12.5px]">
          <div className="flex justify-between"><span className="text-navy-400">Adapter</span><span className="font-medium text-navy-900">BEYLO Sandbox Provider</span></div>
          <div className="flex justify-between"><span className="text-navy-400">Mode</span><span className="font-medium text-navy-900">sandbox</span></div>
          <div className="flex justify-between"><span className="text-navy-400">Webhook signing</span><span className="font-medium text-navy-900">HMAC SHA-256</span></div>
        </div>
      </Card>
    </div>
  </AppShell>
);

/* ----------------------------- Admin users ------------------------------ */

export const AdminUsers: React.FC = () => (
  <AppShell variant="admin" title="Administrator accounts">
    <PageHeader eyebrow="Administration" title="Admin Users" description="Internal BEYLO staff with platform access." />
    <Card className="overflow-hidden">
      <CardHeader title="Administrators" description="All admin accounts require hardware or app-based MFA" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">MFA</th>
              <th className="px-5 py-3 font-medium">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_USERS.map((u) => (
              <tr key={u.id} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-3.5 font-medium text-navy-900">{u.name}</td>
                <td className="px-5 py-3.5 text-[13px] text-navy-400">{u.email}</td>
                <td className="px-5 py-3.5"><Badge tone="gold">{u.role}</Badge></td>
                <td className="px-5 py-3.5"><Badge tone={u.mfa ? 'success' : 'error'} dot>{u.mfa ? 'Enabled' : 'Disabled'}</Badge></td>
                <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateTime(u.lastActive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </AppShell>
);
