import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, PageHeader } from '@/components/beylo/AppShell';
import { Badge, Button, Card, Input, PaymentStatusBadge, SettlementStatusBadge, Select, EmptyState } from '@/components/beylo/primitives';
import { gbp, dateTime, crypto as fmtCrypto } from '@/lib/beylo/format';
import { PAYMENTS, TEAM } from '@/data/beylo';
import { PAYMENT_STATUS_LABEL, SETTLEMENT_STATUS_LABEL, PaymentStatus, SettlementStatus } from '@/lib/beylo/types';
import { Download, Search, SlidersHorizontal, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

const ASSETS = ['USDC', 'USDT', 'BTC', 'ETH'];

const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [settlement, setSettlement] = React.useState('all');
  const [asset, setAsset] = React.useState('all');
  const [user, setUser] = React.useState('all');
  const [minAmount, setMinAmount] = React.useState('');
  const [maxAmount, setMaxAmount] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);

  const rows = PAYMENTS.filter((p) => {
    const text = `${p.paymentId} ${p.reference} ${p.description} ${p.customerName ?? ''} ${p.customerEmail ?? ''}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (status !== 'all' && p.status !== status) return false;
    if (settlement !== 'all' && p.settlementStatus !== settlement) return false;
    if (asset !== 'all' && p.asset !== asset) return false;
    if (user !== 'all' && p.createdBy !== user) return false;
    if (minAmount && p.gbpAmount < Number(minAmount)) return false;
    if (maxAmount && p.gbpAmount > Number(maxAmount)) return false;
    if (dateFrom && new Date(p.createdAt) < new Date(dateFrom)) return false;
    return true;
  });

  const total = rows.reduce((a, r) => a + r.gbpAmount, 0);

  const exportCsv = () => {
    const header = ['Transaction ID', 'Date', 'Reference', 'Customer', 'GBP Amount', 'Crypto Amount', 'Asset', 'Payment Status', 'Settlement'];
    const body = rows.map((r) => [
      r.paymentId, r.createdAt, r.reference, r.customerName ?? '', r.gbpAmount,
      r.cryptoAmount ?? '', r.asset ?? '', PAYMENT_STATUS_LABEL[r.status], SETTLEMENT_STATUS_LABEL[r.settlementStatus],
    ]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `beylo-transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} transactions exported`);
  };

  const reset = () => {
    setQ(''); setStatus('all'); setSettlement('all'); setAsset('all'); setUser('all');
    setMinAmount(''); setMaxAmount(''); setDateFrom('');
  };

  return (
    <AppShell title="All payment sessions">
      <PageHeader
        eyebrow="Payments"
        title="Transactions"
        description={`${rows.length} payment sessions · ${gbp(total)} total value`}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
            <Button variant="gold" onClick={() => navigate('/dashboard/create-payment')}><PlusCircle className="h-4 w-4" /> Create Payment</Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by transaction ID, reference, customer or description" className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
            <Button variant="ghost" onClick={reset}>Reset</Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-navy-700">Payment status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">All statuses</option>
                {(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((s) => (
                  <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-navy-700">Settlement status</label>
              <Select value={settlement} onChange={(e) => setSettlement(e.target.value)}>
                <option value="all">All settlements</option>
                {(Object.keys(SETTLEMENT_STATUS_LABEL) as SettlementStatus[]).map((s) => (
                  <option key={s} value={s}>{SETTLEMENT_STATUS_LABEL[s]}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-navy-700">Crypto asset</label>
              <Select value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="all">All assets</option>
                {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-navy-700">Merchant user</label>
              <Select value={user} onChange={(e) => setUser(e.target.value)}>
                <option value="all">All users</option>
                {TEAM.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-navy-700">Created from</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-navy-700">Min amount (£)</label>
              <Input inputMode="numeric" value={minAmount} onChange={(e) => setMinAmount(e.target.value.replace(/\D/g, ''))} placeholder="10000" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-navy-700">Max amount (£)</label>
              <Input inputMode="numeric" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value.replace(/\D/g, ''))} placeholder="250000" />
            </div>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No transactions match these filters" description="Try widening your date range or clearing filters." action={<Button variant="outline" onClick={reset}>Clear filters</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                  <th className="px-5 py-3 font-medium">Transaction ID</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 text-right font-medium">GBP Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Crypto Amount</th>
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-5 py-3 font-medium">Payment Status</th>
                  <th className="px-5 py-3 font-medium">Settlement</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.paymentId} onClick={() => navigate(`/dashboard/transactions/${p.paymentId}`)} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-canvas/70">
                    <td className="px-5 py-3.5 font-mono text-[12.5px] font-medium text-navy-900">{p.paymentId}</td>
                    <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateTime(p.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-navy-900">{p.reference}</p>
                      <p className="text-[12px] text-navy-400">{p.description}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-navy-700">{p.customerName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-900">{gbp(p.gbpAmount)}</td>
                    <td className="px-5 py-3.5 text-right text-[12.5px] tabular-nums text-navy-700">{p.cryptoAmount && p.asset ? fmtCrypto(p.cryptoAmount, p.asset) : '—'}</td>
                    <td className="px-5 py-3.5">{p.asset ? <Badge>{p.asset}</Badge> : '—'}</td>
                    <td className="px-5 py-3.5"><PaymentStatusBadge status={p.status} /></td>
                    <td className="px-5 py-3.5"><SettlementStatusBadge status={p.settlementStatus} /></td>
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

export default Transactions;
