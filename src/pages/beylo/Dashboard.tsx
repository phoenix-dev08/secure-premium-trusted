import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell, PageHeader } from '@/components/beylo/AppShell';
import { Badge, Button, Card, CardHeader, Money, PaymentStatusBadge, SettlementStatusBadge } from '@/components/beylo/primitives';
import { VolumeAreaChart, AssetDistributionChart } from '@/components/beylo/charts';
import { gbp, dateTime, crypto as fmtCrypto } from '@/lib/beylo/format';
import { VOLUME_SERIES, SETTLEMENTS } from '@/data/beylo';
import { listAllPayments, useMerchantPayments } from '@/lib/beylo/ledger';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowUpRight, PlusCircle, TrendingUp, Wallet, CheckCircle2, Clock3 } from 'lucide-react';

const RANGES = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '12m', label: '12 Months' },
];

const KpiCard: React.FC<{
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}> = ({ label, value, change, positive = true, note, icon: Icon, accent }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-navy-400">{label}</p>
      <span className={`flex h-8 w-8 items-center justify-center rounded-md ${accent ? 'bg-gold-100 text-gold-700' : 'bg-navy-900/5 text-navy-700'}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-3">
      <Money size="md">{value}</Money>
    </div>
    <div className="mt-2 flex items-center gap-2">
      {change && (
        <span className={`inline-flex items-center gap-1 text-[12.5px] font-medium ${positive ? 'text-finsuccess' : 'text-finerror'}`}>
          <TrendingUp className={`h-3.5 w-3.5 ${positive ? '' : 'rotate-180'}`} />
          {change}
        </span>
      )}
      {note && <span className="text-[12.5px] text-navy-400">{note}</span>}
    </div>
  </Card>
);

const Dashboard: React.FC = () => {
  const [range, setRange] = React.useState('30d');
  const navigate = useNavigate();
  const { profile, displayName, can } = useAuth();
  const payments = useMerchantPayments(profile?.is_platform_admin ? undefined : profile?.merchant_id);
  const scoped = profile?.is_platform_admin
    ? listAllPayments()
    : payments;
  const recent = scoped.slice(0, 6);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const pendingSettlement = SETTLEMENTS.filter((s) => s.status === 'settlement_pending').reduce((a, s) => a + s.netGbp, 0);
  const firstName = profile?.first_name || displayName.split(' ')[0] || 'there';
  const successful = scoped.filter((p) => p.status === 'completed' || p.status === 'confirmed');
  const volume = successful.reduce((sum, p) => sum + p.gbpAmount, 0);

  return (
    <AppShell title="Payment activity overview">
      <PageHeader
        eyebrow={profile ? `${profile.role}${profile.is_platform_admin ? ' · Platform admin' : ''}` : 'Overview'}
        title={`${greeting}, ${firstName}`}
        description="Here’s your payment activity."
        actions={
          <>
            {can('Export Reports') && <Button variant="outline" onClick={() => navigate('/dashboard/reports')}>View reports</Button>}
            {can('Create Payments') && (
              <Button variant="gold" onClick={() => navigate('/dashboard/create-payment')}>
                <PlusCircle className="h-4 w-4" /> Create Payment
              </Button>
            )}
          </>
        }
      />


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Payment Volume" value={gbp(volume || 0)} note={`${successful.length} confirmed payments`} icon={Wallet} accent />
        <KpiCard label="Successful Payments" value={String(successful.length)} note="Completed or confirmed" icon={CheckCircle2} />
        <KpiCard label="Awaiting Settlement" value={gbp(pendingSettlement || scoped.filter((p) => p.settlementStatus === 'settlement_pending').reduce((a, p) => a + (p.netGbp ?? p.gbpAmount), 0))} note="Queued GBP payouts" icon={Clock3} />
        <KpiCard label="Settled This Month" value={gbp(scoped.filter((p) => p.settlementStatus === 'settled').reduce((a, p) => a + (p.netGbp ?? 0), 0))} note="Faster Payments" icon={ArrowUpRight} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Payment Volume"
            description="GBP value of payments created through BEYLO"
            action={
              <div className="flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`rounded px-2.5 py-1 text-[12.5px] font-medium transition ${
                      range === r.key ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-400 hover:text-navy-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="px-3 py-4">
            <VolumeAreaChart data={VOLUME_SERIES[range]} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Payment Asset Mix" description="Provider-reported settlement assets" />
            <div className="p-5">
              <AssetDistributionChart height={180} />
            </div>
          </Card>
          <Card className="bg-navy-900 p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-300">Average transaction value</p>
            <p className="mt-2 text-[28px] font-semibold tabular-nums">{gbp(17864.58)}</p>
            <p className="mt-1 text-[13px] text-navy-300">Success rate 92.3% across 26 payment sessions</p>
            <Link to="/dashboard/reports" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gold-400 hover:text-gold-300">
              Open reporting <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader
          title="Recent Transactions"
          description="Latest payment sessions across your business"
          action={<Button variant="outline" size="sm" onClick={() => navigate('/dashboard/transactions')}>View all</Button>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                <th className="px-5 py-3 font-medium">Transaction ID</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Customer / Reference</th>
                <th className="px-5 py-3 text-right font-medium">GBP Amount</th>
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 font-medium">Payment Status</th>
                <th className="px-5 py-3 font-medium">Settlement</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr
                  key={p.paymentId}
                  onClick={() => navigate(`/dashboard/transactions/${p.paymentId}`)}
                  className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-canvas/70"
                >
                  <td className="px-5 py-3.5 font-mono text-[12.5px] font-medium text-navy-900">{p.paymentId}</td>
                  <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateTime(p.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-navy-900">{p.description}</p>
                    <p className="text-[12.5px] text-navy-400">{p.reference}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-900">{gbp(p.gbpAmount)}</td>
                  <td className="px-5 py-3.5">
                    {p.asset ? (
                      <div>
                        <Badge tone="neutral">{p.asset}</Badge>
                        <p className="mt-1 text-[11.5px] text-navy-400">{p.cryptoAmount ? fmtCrypto(p.cryptoAmount, p.asset) : p.network}</p>
                      </div>
                    ) : (
                      <span className="text-navy-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-5 py-3.5"><SettlementStatusBadge status={p.settlementStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
};

export default Dashboard;
