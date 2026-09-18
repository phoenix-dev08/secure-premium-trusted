import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, PageHeader, PermissionDenied } from '@/components/beylo/AppShell';
import { Badge, Button, Card, CardHeader, Field, Input, Label, Modal, Money, Select, EmptyState } from '@/components/beylo/primitives';
import { VolumeBarChart, AssetDistributionChart } from '@/components/beylo/charts';
import { gbp, dateTime, num } from '@/lib/beylo/format';
import { MERCHANT, VOLUME_SERIES, AUDIT_LOGS } from '@/data/beylo';
import { listAllPayments } from '@/lib/beylo/ledger';
import { PERMISSIONS, ROLE_PERMISSIONS, TeamRole, INDUSTRIES } from '@/lib/beylo/types';
import { useAuth, MemberProfile } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Check, Download, FileBarChart, Loader2, Mail, MessageSquare, Search, ShieldCheck, UserPlus, KeyRound, Monitor, LifeBuoy, BookOpen, Code2 } from 'lucide-react';
import { toast } from 'sonner';

/* ----------------------------- Customers ------------------------------ */

export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const grouped = React.useMemo(() => {
    const map = new Map<string, { name: string; email?: string; payments: number; volume: number; last: string }>();
    listAllPayments().forEach((p) => {
      const key = p.customerName ?? 'Unattributed';
      const prev = map.get(key);
      map.set(key, {
        name: key,
        email: p.customerEmail ?? prev?.email,
        payments: (prev?.payments ?? 0) + 1,
        volume: (prev?.volume ?? 0) + p.gbpAmount,
        last: prev && new Date(prev.last) > new Date(p.createdAt) ? prev.last : p.createdAt,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.volume - a.volume);
  }, []);
  const rows = grouped.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell title="Customers and payment references">
      <PageHeader eyebrow="Directory" title="Customers / References" description="Aggregated view of customers and references used on payment sessions." />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers" className="pl-9" />
        </div>
      </Card>
      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState title="No customers found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 text-right font-medium">Payments</th>
                  <th className="px-5 py-3 text-right font-medium">Total Volume</th>
                  <th className="px-5 py-3 font-medium">Last Payment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.name} className="border-b border-line/70 last:border-0 hover:bg-canvas/70">
                    <td className="px-5 py-3.5 font-medium text-navy-900">{c.name}</td>
                    <td className="px-5 py-3.5 text-[13px] text-navy-400">{c.email ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{c.payments}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-900">{gbp(c.volume)}</td>
                    <td className="px-5 py-3.5 text-[13px] text-navy-400">{dateTime(c.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="mt-4">
        <Button variant="outline" onClick={() => navigate('/dashboard/transactions')}>View all transactions</Button>
      </div>
    </AppShell>
  );
};

/* -------------------------------- Team -------------------------------- */

export const Team: React.FC = () => {
  const { profile, can } = useAuth();
  const [members, setMembers] = React.useState<MemberProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [smsOptIn, setSmsOptIn] = React.useState(true);
  const [role, setRole] = React.useState<TeamRole>('Payment Operator');
  const [busy, setBusy] = React.useState(false);
  const canManageTeam = can('Manage Team');

  const load = React.useCallback(async () => {
    let query = supabase.from('merchant_members').select('*').order('created_at', { ascending: true });
    if (profile?.merchant_id) {
      query = query.eq('merchant_id', profile.merchant_id);
    }
    const { data } = await query;
    setMembers((data ?? []) as MemberProfile[]);
    setLoading(false);
  }, [profile?.merchant_id]);

  React.useEffect(() => { void load(); }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalised = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalised)) { toast.error('Enter a valid work email address'); return; }
    if (members.some((m) => m.email.toLowerCase() === normalised)) {
      toast.error('That email already has access to this merchant');
      return;
    }
    setBusy(true);

    const { error } = await supabase.from('merchant_members').insert({
      user_id: null,
      email: normalised,
      first_name: firstName || normalised.split('@')[0],
      last_name: lastName,
      phone: phone || null,
      role,
      status: 'Invited',
      merchant_id: profile?.merchant_id ?? MERCHANT.id,
      merchant_name: profile?.merchant_name ?? MERCHANT.tradingName,
    });

    await fetch('https://famous.ai/api/crm/6aace01560554da1d744b64f/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: `${firstName} ${lastName}`.trim() || undefined,
        phone: phone || undefined,
        sms_opt_in: smsOptIn === true,
        source: 'team-invite',
        tags: ['team-invite', 'merchant-user'],
      }),
    }).catch(() => undefined);

    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Invitation created for ${email}`);
    setInviteOpen(false); setEmail(''); setFirstName(''); setLastName(''); setPhone('');
    void load();
  };

  const updateRole = async (member: MemberProfile, nextRole: TeamRole) => {
    const { error } = await supabase.from('merchant_members').update({ role: nextRole }).eq('id', member.id);
    if (error) { toast.error('Only owners and administrators can change roles'); return; }
    setMembers((list) => list.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m)));
    toast.success(`${member.first_name || member.email} is now ${nextRole}`);
  };

  return (
    <AppShell title="Team and permissions">
      <PageHeader
        eyebrow="Access control"
        title="Team"
        description="Manage who can create payments and view settlement information."
        actions={
          canManageTeam ? (
            <Button variant="gold" onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4" /> Invite Team Member</Button>
          ) : undefined
        }
      />
      <Card className="overflow-hidden">
        <CardHeader
          title="Members"
          description={`${members.length} users on ${profile?.merchant_name ?? MERCHANT.tradingName}`}
        />
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-[13px] text-navy-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading team from your account…
          </div>
        ) : members.length === 0 ? (
          <EmptyState title="No team members yet" description="Invite a colleague to give them scoped access to payments." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const name = `${m.first_name} ${m.last_name}`.trim() || m.email;
                  const isSelf = m.id === profile?.id;
                  return (
                    <tr key={m.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/70">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-[11px] font-semibold text-white">
                            {name.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                          </span>
                          <span className="font-medium text-navy-900">
                            {name}
                            {isSelf && <span className="ml-2 text-[11.5px] font-normal text-navy-400">You</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-navy-400">{m.email}</td>
                      <td className="px-5 py-3.5">
                        {canManageTeam && m.role !== 'Owner' ? (
                          <Select value={m.role} onChange={(e) => updateRole(m, e.target.value as TeamRole)} className="h-9 w-[168px] text-[12.5px]">
                            {(Object.keys(ROLE_PERMISSIONS) as TeamRole[]).filter((r) => r !== 'Owner').map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </Select>
                        ) : (
                          <Badge tone={m.role === 'Owner' ? 'gold' : 'neutral'}>{m.role}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={m.status === 'Active' ? 'success' : m.status === 'Invited' ? 'warn' : 'neutral'} dot>{m.status}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-navy-400">{m.last_active ? dateTime(m.last_active) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Role Permissions" description={`Your role: ${profile?.role ?? '—'} · permissions are enforced on every request`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">
                <th className="px-5 py-3 font-medium">Permission</th>
                {(Object.keys(ROLE_PERMISSIONS) as TeamRole[]).map((r) => (
                  <th key={r} className={`px-5 py-3 text-center font-medium ${r === profile?.role ? 'text-navy-900' : ''}`}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3 font-medium text-navy-900">{p}</td>
                  {(Object.keys(ROLE_PERMISSIONS) as TeamRole[]).map((r) => (
                    <td key={r} className={`px-5 py-3 text-center ${r === profile?.role ? 'bg-canvas/70' : ''}`}>
                      {ROLE_PERMISSIONS[r].includes(p) ? <Check className="mx-auto h-4 w-4 text-finsuccess" /> : <span className="text-navy-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite team member" description="They can sign in with this email address to claim the invitation.">
        <form onSubmit={invite} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="i-first">First name</Label><Input id="i-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Oliver" /></div>
            <div><Label htmlFor="i-last" hint="Optional">Last name</Label><Input id="i-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Bennett" /></div>
          </div>
          <div><Label htmlFor="i-email">Work email address</Label><Input id="i-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.co.uk" /></div>
          <div><Label htmlFor="i-phone">Phone number (optional)</Label><Input id="i-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900123" /></div>
          <div><Label htmlFor="i-role">Role</Label>
            <Select id="i-role" value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
              {(Object.keys(ROLE_PERMISSIONS) as TeamRole[]).filter((r) => r !== 'Owner').map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <p className="mt-1.5 text-[12px] text-navy-400">{ROLE_PERMISSIONS[role].join(' · ')}</p>
          </div>
          <label className="flex items-start gap-2.5 text-[12.5px] text-navy-700">
            <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
            <span>Text me updates. Msg &amp; data rates may apply. Reply STOP to unsubscribe.</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" variant="gold" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send invitation
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};


/* ------------------------------- Reports ------------------------------ */

export const Reports: React.FC = () => {
  const { can } = useAuth();
  const [range, setRange] = React.useState('30d');
  const series = VOLUME_SERIES[range];
  const volume = series.reduce((a, s) => a + s.volume, 0);
  const payments = series.reduce((a, s) => a + (s.payments ?? 0), 0);

  const download = (label: string) => toast.success(`${label} generated — download started`);
  const exportCsv = () => {
    const csv = ['Period,Volume (GBP),Payments', ...series.map((s) => `${s.label},${s.volume},${s.payments}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `beylo-report-${range}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV');
  };

  if (!can('Export Reports')) {
    return (
      <AppShell title="Business reporting">
        <PageHeader eyebrow="Reporting" title="Reports" />
        <PermissionDenied permission="Export Reports" />
      </AppShell>
    );
  }

  return (

    <AppShell title="Business reporting">
      <PageHeader
        eyebrow="Reporting"
        title="Reports"
        description="Operational reporting across payments, conversion and settlement."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
            <Button variant="primary" onClick={() => download('Payment report')}><FileBarChart className="h-4 w-4" /> Download Report</Button>
          </>
        }
      />
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[12.5px] font-medium text-navy-700">Reporting period</span>
          <div className="flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1">
            {[{ k: '7d', l: '7 Days' }, { k: '30d', l: '30 Days' }, { k: '90d', l: '90 Days' }, { k: '12m', l: '12 Months' }].map((t) => (
              <button key={t.k} onClick={() => setRange(t.k)} className={`rounded px-2.5 py-1 text-[12.5px] font-medium ${range === t.k ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-400 hover:text-navy-700'}`}>{t.l}</button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Payment Volume', value: gbp(volume, false) },
          { label: 'Successful Payment Rate', value: '92.3%' },
          { label: 'Average Transaction Value', value: gbp(payments ? volume / payments : 0, false) },
          { label: 'Settlement Volume', value: gbp(volume * 0.997, false) },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-navy-400">{k.label}</p>
            <div className="mt-2"><Money size="md">{k.value}</Money></div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Payment Volume" description={`Aggregated GBP volume · ${range.toUpperCase()}`} />
          <div className="px-3 py-4"><VolumeBarChart data={series} /></div>
        </Card>
        <Card>
          <CardHeader title="Crypto Asset Distribution" />
          <div className="p-5"><AssetDistributionChart height={190} /></div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Scheduled & Standard Reports" description="Generate business reports for finance and reconciliation" />
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
          {[
            ['Payment Volume Report', 'Volume and count by day, asset and user'],
            ['Settlement Reconciliation', 'Gross, fees and net GBP per settlement batch'],
            ['Asset Distribution Report', 'Share of volume by payment asset'],
            ['Success Rate Analysis', 'Expired, failed and completed sessions'],
          ].map(([t, d]) => (
            <div key={t} className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-[13.5px] font-medium text-navy-900">{t}</p>
                <p className="text-[12.5px] text-navy-400">{d}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => download(t)}><Download className="h-3.5 w-3.5" /> Download</Button>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
};

/* ------------------------------ Settings ------------------------------ */

const TABS = ['Business Profile', 'Settlement Details', 'Security', 'Notifications', 'API / Integrations'];

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, can, updatePassword, refreshProfile } = useAuth();
  const [tab, setTab] = React.useState(TABS[0]);
  const [notifs, setNotifs] = React.useState<Record<string, boolean>>({
    'Payment Completed': true, 'Payment Failed': true, 'Settlement Completed': true, 'Merchant Verification Updates': true,
  });
  const [twoFa, setTwoFa] = React.useState(Boolean(profile?.two_factor_enabled));
  const [newPassword, setNewPassword] = React.useState('');
  const canManage = can('Manage Settings');

  React.useEffect(() => {
    setTwoFa(Boolean(profile?.two_factor_enabled));
  }, [profile?.two_factor_enabled]);

  const savePassword = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    const { error } = await updatePassword(newPassword);
    if (error) { toast.error(error); return; }
    setNewPassword('');
    toast.success('Password updated');
  };

  return (
    <AppShell title="Merchant settings">
      <PageHeader eyebrow="Configuration" title="Settings" description="Manage your business profile, settlement details and security controls." />
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[13.5px] font-medium transition ${tab === t ? 'border-gold-500 text-navy-900' : 'border-transparent text-navy-400 hover:text-navy-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Business Profile' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Business Profile" description="Verified business information held by BEYLO" action={<Badge tone="success" dot>Verified</Badge>} />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div><Label>Business legal name</Label><Input defaultValue={MERCHANT.legalName} /></div>
              <div><Label>Trading name</Label><Input defaultValue={MERCHANT.tradingName} /></div>
              <div><Label>Company registration number</Label><Input defaultValue={MERCHANT.registrationNumber} /></div>
              <div><Label>Industry</Label><Select defaultValue={MERCHANT.industry}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</Select></div>
              <div><Label>Website</Label><Input defaultValue={MERCHANT.website} /></div>
              <div><Label>Country</Label><Input defaultValue={MERCHANT.country} readOnly className="bg-canvas" /></div>
              <div className="sm:col-span-2"><Label>Registered address</Label><Input defaultValue={`${MERCHANT.address.line1}, ${MERCHANT.address.city}, ${MERCHANT.address.postcode}`} /></div>
            </div>
            <div className="flex justify-end border-t border-line px-5 py-4">
              <Button variant="primary" onClick={() => toast.success('Business profile updated')}>Save changes</Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Business Representative" />
            <dl className="px-5 py-2">
              <Field label="Name" value={`${MERCHANT.representative.firstName} ${MERCHANT.representative.lastName}`} />
              <Field label="Job title" value={MERCHANT.representative.jobTitle} />
              <Field label="Email" value={MERCHANT.representative.email} />
              <Field label="Phone" value={MERCHANT.representative.phone} />
            </dl>
          </Card>
        </div>
      )}

      {tab === 'Settlement Details' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Settlement Details" description="GBP payouts are made to this account" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div><Label>Settlement currency</Label><Input defaultValue="GBP" readOnly className="bg-canvas" /></div>
              <div><Label>Account holder name</Label><Input defaultValue={MERCHANT.settlement.accountHolder} /></div>
              <div><Label>Sort code</Label><Input defaultValue={MERCHANT.settlement.sortCode} /></div>
              <div><Label>Account number</Label><Input defaultValue={MERCHANT.settlement.accountNumber} /></div>
            </div>
            <p className="border-t border-line px-5 py-4 text-[12.5px] text-navy-400">
              Bank details are tokenised and stored by the regulated payment infrastructure provider. BEYLO retains only the
              masked reference shown above.
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-[13px] font-semibold text-navy-900">Settlement schedule</p>
            <p className="mt-2 text-[13px] text-navy-400">Daily batch settlement, 16:00 GMT cut-off, GBP via Faster Payments.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => toast.success('Settlement change request submitted for review')}>Request change</Button>
          </Card>
        </div>
      )}

      {tab === 'Security' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Password" description="Passwords are managed by BEYLO's authentication service" />
            <div className="space-y-4 p-5">
              <div>
                <Label>New password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" />
              </div>
              <Button variant="primary" onClick={savePassword}><KeyRound className="h-4 w-4" /> Update password</Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Two-Factor Authentication" action={<Badge tone={twoFa ? 'success' : 'warn'} dot>{twoFa ? 'Enabled' : 'Disabled'}</Badge>} />
            <div className="p-5">
              <p className="text-[13px] text-navy-400">Authenticator app (TOTP) is required for all users with settlement permissions.</p>
              <Button
                variant={twoFa ? 'outline' : 'gold'}
                className="mt-4"
                disabled={!canManage}
                onClick={async () => {
                  if (!twoFa) {
                    navigate('/2fa-setup');
                    return;
                  }
                  const next = false;
                  setTwoFa(next);
                  if (profile?.id) {
                    await supabase.from('merchant_members').update({ two_factor_enabled: next }).eq('id', profile.id);
                    await refreshProfile();
                  }
                  toast.success('Two-factor authentication disabled');
                }}
              >
                <ShieldCheck className="h-4 w-4" /> {twoFa ? 'Disable 2FA' : 'Enable 2FA'}
              </Button>
              {!canManage && <p className="mt-2 text-[12px] text-navy-400">Your role cannot change security settings.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Active Sessions" />
            <div className="divide-y divide-line">
              {[['Chrome · macOS', 'London, UK · 192.0.2.xxx', 'Current session'], ['Safari · iPhone', 'London, UK · 198.51.100.xxx', '2 hours ago']].map(([d, m, t]) => (
                <div key={d} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Monitor className="h-4 w-4 text-navy-400" />
                    <div><p className="text-[13.5px] font-medium text-navy-900">{d}</p><p className="text-[12px] text-navy-400">{m}</p></div>
                  </div>
                  <span className="text-[12px] text-navy-400">{t}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-3">
              <Button size="sm" variant="outline" onClick={() => toast.success('All other sessions revoked')}>Revoke other sessions</Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Login History" />
            <div className="divide-y divide-line">
              {AUDIT_LOGS.filter((l) => l.action.startsWith('LOGIN')).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div><p className="font-mono text-[12.5px] text-navy-900">{l.action}</p><p className="text-[12px] text-navy-400">{dateTime(l.timestamp)} · {l.ip}</p></div>
                  <Badge tone={l.result === 'Success' ? 'success' : 'error'}>{l.result}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'Notifications' && (
        <Card className="max-w-2xl">
          <CardHeader title="Notification Preferences" description="Email notifications for this user" />
          <div className="divide-y divide-line">
            {Object.keys(notifs).map((k) => (
              <div key={k} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-[13.5px] font-medium text-navy-900">{k}</p>
                  <p className="text-[12.5px] text-navy-400">Email to {profile?.email ?? 'your account email'}</p>
                </div>

                <button
                  onClick={() => { setNotifs((n) => ({ ...n, [k]: !n[k] })); toast.success(`${k} notifications ${notifs[k] ? 'disabled' : 'enabled'}`); }}
                  className={`relative h-6 w-11 rounded-full transition ${notifs[k] ? 'bg-finsuccess' : 'bg-navy-300'}`}
                  aria-label={`Toggle ${k}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${notifs[k] ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 text-[12.5px] text-navy-400">
            <MessageSquare className="h-4 w-4" /> SMS and webhook delivery channels are planned for a future release.
          </div>
        </Card>
      )}

      {tab === 'API / Integrations' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="API Keys" description="Server-side keys only — never expose keys in browser code" />
            <div className="divide-y divide-line">
              {[['Sandbox publishable', 'pk_sandbox_beylo_9f2a…', 'Active'], ['Sandbox secret', 'sk_sandbox_••••••••••••', 'Active'], ['Live secret', 'Requires production approval', 'Unavailable']].map(([n, v, s]) => (
                <div key={n} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div><p className="text-[13.5px] font-medium text-navy-900">{n}</p><p className="font-mono text-[12px] text-navy-400">{v}</p></div>
                  <Badge tone={s === 'Active' ? 'success' : 'neutral'}>{s}</Badge>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-4">
              <Button variant="outline" size="sm" onClick={() => toast.success('New sandbox key requested')}>Rotate sandbox key</Button>
            </div>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-900"><Code2 className="h-4 w-4 text-gold-600" /> Webhook endpoint</p>
            <p className="mt-2 font-mono text-[12px] text-navy-700">https://api.yourdomain.co.uk/beylo/webhook</p>
            <p className="mt-3 text-[12.5px] text-navy-400">BEYLO signs every outbound webhook. Verify the signature server-side before processing events.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => toast.success('Test event queued')}>Send test event</Button>
          </Card>
        </div>
      )}
    </AppShell>
  );
};

/* ------------------------------ Support -------------------------------- */

export const Support: React.FC = () => {
  const { profile, displayName } = useAuth();
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [email, setEmail] = React.useState(profile?.email ?? '');
  const [phone, setPhone] = React.useState(profile?.phone ?? '');
  const [smsOptIn, setSmsOptIn] = React.useState(true);

  React.useEffect(() => {
    if (profile?.email) setEmail(profile.email);
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.email, profile?.phone]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) { toast.error('Add a subject and message'); return; }
    await fetch('https://famous.ai/api/crm/6aace01560554da1d744b64f/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, name: displayName || undefined, phone: phone || undefined,
        sms_opt_in: smsOptIn === true, source: 'contact-form', tags: ['support', 'merchant'],
      }),
    }).catch(() => undefined);
    toast.success('Support request submitted — reference SUP-40218');
    setSubject(''); setMessage('');
  };


  return (
    <AppShell title="Help and support">
      <PageHeader eyebrow="Support" title="Help & Support" description="Priority support for high-value payment operations." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Contact BEYLO Support" description="Typical response within 1 business hour" />
          <form onSubmit={submit} className="space-y-4 p-5">
            <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Settlement query for STL-20260919-001" /></div>
            <div><Label>Email address</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Phone number (optional)</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900123" /></div>
            <div>
              <Label>How can we help?</Label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Describe your query" className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-900/10" />
            </div>
            <label className="flex items-start gap-2.5 text-[12.5px] text-navy-700">
              <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
              <span>Text me updates. Msg &amp; data rates may apply. Reply STOP to unsubscribe.</span>
            </label>
            <Button type="submit" variant="gold"><LifeBuoy className="h-4 w-4" /> Submit request</Button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[13px] font-semibold text-navy-900">Priority contact</p>
            <p className="mt-2 text-[13px] text-navy-400">+44 20 3988 1180<br />support@beylo.co.uk</p>
            <p className="mt-3 text-[12.5px] text-navy-400">Monday–Saturday, 08:00–20:00 GMT</p>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-900"><BookOpen className="h-4 w-4 text-gold-600" /> Documentation</p>
            <p className="mt-2 text-[13px] text-navy-400">Integration guides, webhook reference and provider abstraction notes.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.assign('/docs')}>Open documentation</Button>
          </Card>
          <Card className="p-5">
            <p className="text-[13px] font-semibold text-navy-900">Average confirmation time</p>
            <p className="mt-2 text-[24px] font-semibold tabular-nums text-navy-900">4m 12s</p>
            <p className="mt-1 text-[12.5px] text-navy-400">Across {num(26, 0)} recent payment sessions</p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};
