import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, BackLink, PageHeader } from '@/components/beylo/AppShell';
import { Badge, Button, Card, CardHeader, Field, Money, SettlementStatusBadge, EmptyState } from '@/components/beylo/primitives';
import { gbp, dateShort, dateTime } from '@/lib/beylo/format';
import { SETTLEMENTS, MERCHANT, PAYMENTS } from '@/data/beylo';
import { Download, Landmark } from 'lucide-react';
import { toast } from 'sonner';

const SummaryCard: React.FC<{ label: string; value: string; note: string; tone?: 'gold' | 'navy' | 'green' }> = ({ label, value, note, tone = 'navy' }) => (
  <Card className="p-5">
    <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-navy-400">{label}</p>
    <div className="mt-2"><Money size="md">{value}</Money></div>
    <p className={`mt-1.5 text-[12.5px] ${tone === 'green' ? 'text-finsuccess' : tone === 'gold' ? 'text-gold-700' : 'text-navy-400'}`}>{note}</p>
  </Card>
);

export const Settlements: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState('all');
  const rows = SETTLEMENTS.filter((s) => status === 'all' || s.status === status);

  return (
    <AppShell title="GBP settlements to your bank account">
      <PageHeader
        eyebrow="Settlement"
        title="Settlements"
        description={`Settled in ${MERCHANT.settlement.currency} to ${MERCHANT.settlement.bank} ${MERCHANT.settlement.accountNumber}`}
        actions={<Button variant="outline" onClick={() => toast.success('Settlement statement downloaded')}><Download className="h-4 w-4" /> Download statement</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Pending Settlement" value={gbp(72500, false)} note="2 payments awaiting payout" tone="gold" />
        <SummaryCard label="Processing" value={gbp(25000, false)} note="Expected today by 17:00" />
        <SummaryCard label="Settled This Month" value={gbp(356250, false)} note="+8.1% vs previous month" tone="green" />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader
          title="Settlement Batches"
          description="Each batch aggregates confirmed payments converted to GBP by the provider"
          action={
            <div className="flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1">
              {[
                { k: 'all', l: 'All' },
                { k: 'settlement_pending', l: 'Pending' },
                { k: 'processing', l: 'Processing' },
                { k: 'settled', l: 'Settled' },
              ].map((t) => (
                <button key={t.k} onClick={() => setStatus(t.k)} className={`rounded px-2.5 py-1 text-[12.5px] font-medium ${status === t.k ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-400 hover:text-navy-700'}`}>
                  {t.l}
                </button>
              ))}
            </div>
          }
        />
        {rows.length === 0 ? (
          <EmptyState title="No settlements in this view" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                  <th className="px-5 py-3 font-medium">Settlement ID</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Transactions</th>
                  <th className="px-5 py-3 text-right font-medium">Gross</th>
                  <th className="px-5 py-3 text-right font-medium">Fees</th>
                  <th className="px-5 py-3 text-right font-medium">Net Settlement</th>
                  <th className="px-5 py-3 font-medium">Bank Account</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.settlementId} onClick={() => navigate(`/dashboard/settlements/${s.settlementId}`)} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-canvas/70">
                    <td className="px-5 py-3.5 font-mono text-[12.5px] font-medium text-navy-900">{s.settlementId}</td>
                    <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateShort(s.date)}</td>
                    <td className="px-5 py-3.5"><Badge>{s.transactions.length} payments</Badge></td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{gbp(s.grossGbp)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-navy-400">{gbp(s.feesGbp)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-900">{gbp(s.netGbp)}</td>
                    <td className="px-5 py-3.5 text-[13px] text-navy-700">{s.bankAccount}</td>
                    <td className="px-5 py-3.5"><SettlementStatusBadge status={s.status} /></td>
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

export const SettlementDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const settlement = SETTLEMENTS.find((s) => s.settlementId === id);

  if (!settlement) {
    return (
      <AppShell>
        <BackLink to="/dashboard/settlements" label="Back to settlements" />
        <Card><EmptyState title="Settlement not found" action={<Button onClick={() => navigate('/dashboard/settlements')}>View settlements</Button>} /></Card>
      </AppShell>
    );
  }

  const related = PAYMENTS.filter((p) => settlement.transactions.includes(p.paymentId));

  return (
    <AppShell title={`Settlement ${settlement.settlementId}`}>
      <BackLink to="/dashboard/settlements" label="Back to settlements" />
      <PageHeader
        eyebrow="Settlement batch"
        title={settlement.settlementId}
        description={`Created ${dateTime(settlement.date)} · ${settlement.transactions.length} payments`}
        actions={<Button variant="outline" onClick={() => toast.success('Settlement advice downloaded')}><Download className="h-4 w-4" /> Settlement advice</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Settlement Summary" action={<SettlementStatusBadge status={settlement.status} />} />
          <div className="border-b border-line px-5 py-5">
            <p className="text-[12px] uppercase tracking-[0.1em] text-navy-400">Net Settlement</p>
            <div className="mt-1"><Money size="lg">{gbp(settlement.netGbp)}</Money></div>
          </div>
          <dl className="grid grid-cols-1 gap-x-8 px-5 py-2 sm:grid-cols-2">
            <Field label="Gross Amount" value={gbp(settlement.grossGbp)} />
            <Field label="Fees" value={gbp(settlement.feesGbp)} />
            <Field label="Bank Account" value={`${MERCHANT.settlement.bank} · ${settlement.bankAccount}`} />
            <Field label="Payment Reference" value={settlement.reference} mono />
            <Field label="Expected / Value Date" value={dateTime(settlement.expectedDate)} />
            <Field label="Settlement Currency" value="GBP" />
          </dl>
        </Card>

        <Card className="p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-900"><Landmark className="h-4 w-4 text-gold-600" /> Payout rail</p>
          <p className="mt-2 text-[13px] leading-relaxed text-navy-400">
            Conversion and GBP payout are executed by the payment infrastructure provider over UK Faster Payments.
            BEYLO records provider settlement events and reconciles them against payment sessions.
          </p>
          <div className="mt-4 space-y-2 border-t border-line pt-4 text-[13px]">
            <div className="flex justify-between"><span className="text-navy-400">Conversion</span><span className="font-medium text-navy-900">Crypto → GBP</span></div>
            <div className="flex justify-between"><span className="text-navy-400">Rail</span><span className="font-medium text-navy-900">Faster Payments</span></div>
            <div className="flex justify-between"><span className="text-navy-400">Cut-off</span><span className="font-medium text-navy-900">16:00 GMT</span></div>
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Related Transactions" description="Payments included in this settlement batch" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                <th className="px-5 py-3 font-medium">Transaction ID</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 text-right font-medium">GBP Amount</th>
                <th className="px-5 py-3 text-right font-medium">Fees</th>
                <th className="px-5 py-3 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {related.map((p) => (
                <tr key={p.paymentId} onClick={() => navigate(`/dashboard/transactions/${p.paymentId}`)} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-canvas/70">
                  <td className="px-5 py-3.5 font-mono text-[12.5px] font-medium text-navy-900">{p.paymentId}</td>
                  <td className="px-5 py-3.5 text-[13px] text-navy-700">{p.reference}</td>
                  <td className="px-5 py-3.5">{p.asset ? <Badge>{p.asset}</Badge> : '—'}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-900">{gbp(p.gbpAmount)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-400">{p.feesGbp ? gbp(p.feesGbp) : '—'}</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-900">{p.netGbp ? gbp(p.netGbp) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
};

export default Settlements;
