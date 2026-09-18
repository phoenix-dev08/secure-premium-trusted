import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, BeyloLogo, Button, Card, Money } from '@/components/beylo/primitives';

import { gbp } from '@/lib/beylo/format';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Building2,
  Check,
  Clock,
  FileCheck2,
  Gem,
  Landmark,
  Lock,
  Menu,
  Palette,
  Receipt,
  Anchor,

  ShieldCheck,
  Watch,
  X,
  Car,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const HERO = 'https://d64gsuwffb70l.cloudfront.net/6aace01560554da1d744b64f_1789714546592_22417a94.jpg';
const SHOWROOM = 'https://d64gsuwffb70l.cloudfront.net/6aace01560554da1d744b64f_1789714546269_c5cc1a5f.jpg';
const WATCH = 'https://d64gsuwffb70l.cloudfront.net/6aace01560554da1d744b64f_1789714563026_ea60bad0.jpg';

const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'How it works', href: '#how' },
  { label: 'Industries', href: '#industries' },
  { label: 'Settlement', href: '#settlement' },
  { label: 'Pricing', href: '#pricing' },
];

const INDUSTRY_CARDS = [
  { icon: Car, title: 'Luxury Automotive', copy: 'Dealerships taking deposits and full payment on £50k–£500k vehicles.', typical: '£124,500' },
  { icon: Watch, title: 'Luxury Watches', copy: 'Authorised dealers and the secondary market for premium timepieces.', typical: '£31,750' },
  { icon: Gem, title: 'Jewellery', copy: 'High-value bespoke commissions, diamonds and coloured stones.', typical: '£42,000' },
  { icon: Palette, title: 'Fine Art', copy: 'Galleries and private sales requiring documented settlement.', typical: '£89,000' },
  { icon: Anchor, title: 'Marine & Yachts', copy: 'Brokerage deposits and staged completion payments.', typical: '£230,000' },

  { icon: Building2, title: 'Property Services', copy: 'Reservation fees and professional service invoices.', typical: '£18,750' },
  { icon: ShoppingBag, title: 'Premium Retail', copy: 'Flagship stores serving international clients.', typical: '£12,400' },
  { icon: Landmark, title: 'Private Clients', copy: 'Family offices and concierge purchasing on behalf of clients.', typical: '£268,000' },
];

const FEATURES = [
  { icon: Banknote, title: 'GBP in, GBP out', copy: 'You price in pounds and settle in pounds. BEYLO never leaves your business exposed to crypto volatility.' },
  { icon: Clock, title: 'Provider-locked rates', copy: 'Live quotes are locked by our infrastructure provider for a short window and shown with a visible countdown.' },
  { icon: ShieldCheck, title: 'Institutional controls', copy: 'Role-based access, two-factor authentication, session management and append-only audit logging.' },
  { icon: Receipt, title: 'Reconciliation built in', copy: 'Every settlement batch links back to the underlying payments with gross, fees and net GBP.' },
  { icon: FileCheck2, title: 'Verified merchants only', copy: 'KYB and representative checks before activation, with transparent verification status.' },
  { icon: BarChart3, title: 'Operational reporting', copy: 'Volume, success rate, average transaction value and asset distribution, exportable to CSV.' },
];

const STEPS = [
  { n: '01', title: 'Create the payment', copy: 'Enter the GBP amount and your reference — an invoice number, order or vehicle registration.' },
  { n: '02', title: 'Share a secure link', copy: 'Send the hosted checkout link or let your customer scan the QR code in your showroom.' },
  { n: '03', title: 'Customer pays', copy: 'They choose a supported asset, receive a locked quote and precise payment instructions.' },
  { n: '04', title: 'You get paid in GBP', copy: 'Confirmation arrives from the provider, funds convert, and GBP settles to your bank account.' },
];

const Header: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <BeyloLogo tone="light" to="/" />
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[13.5px] font-medium text-navy-300 transition hover:text-white">{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/docs"><Button variant="ghost" size="sm" className="text-navy-300 hover:bg-white/10 hover:text-white">Documentation</Button></Link>
          <Link to="/signin"><Button variant="outline" size="sm" className="border-white/20 bg-transparent text-white hover:bg-white/10">Sign in</Button></Link>
          <Link to="/onboarding"><Button variant="gold" size="sm">Open an account</Button></Link>
        </div>
        <button className="rounded-md p-2 text-white md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-navy-950 px-4 py-4 md:hidden">
          <div className="space-y-1">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-[14px] text-navy-300 hover:bg-white/5 hover:text-white">{l.label}</a>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
            <Link to="/signin" onClick={() => setOpen(false)}><Button variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10">Sign in</Button></Link>
            <Link to="/onboarding" onClick={() => setOpen(false)}><Button variant="gold" className="w-full">Open an account</Button></Link>
          </div>
        </div>
      )}
    </header>
  );
};

const CheckoutPreview: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-white/10 bg-white p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold tracking-[0.2em] text-navy-900">BEYLO</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-finsuccess-soft px-2 py-1 text-[11px] font-medium text-finsuccess"><Lock className="h-3 w-3" /> Secure Payment</span>
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-navy-400">Prestige Automotive London</p>
        <p className="mt-0.5 text-[13px] font-medium text-navy-900">Range Rover Autobiography</p>
      </div>
      <div className="mt-4 rounded-lg bg-canvas px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-navy-400">Amount Due</p>
        <div className="mt-1"><Money size="lg">{gbp(50000)}</Money></div>
      </div>
      <div className="mt-4 space-y-2">
        {[['USDC', 'USD Coin · Ethereum', true], ['BTC', 'Bitcoin · Bitcoin network', false]].map(([a, n, sel]) => (
          <div key={a as string} className={`flex items-center gap-3 rounded-lg border p-3 ${sel ? 'border-navy-900 bg-navy-900/[0.03]' : 'border-line'}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fininfo-soft text-[13px] font-semibold text-fininfo">{(a as string)[0]}</span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-navy-900">{a}</p>
              <p className="text-[11.5px] text-navy-400">{n}</p>
            </div>
            {sel ? <span className="flex h-4 w-4 items-center justify-center rounded-full bg-navy-900 text-white"><Check className="h-2.5 w-2.5" /></span> : <span className="h-4 w-4 rounded-full border border-line" />}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
        <span className="text-[12px] text-navy-400">Quote expires in</span>
        <span className="text-[16px] font-semibold tabular-nums text-navy-900">09:42</span>
      </div>
      <Button variant="gold" className="mt-4 w-full" onClick={() => navigate('/pay/BYL-240918-004')}>Continue to Quote</Button>
      <p className="mt-2 text-center text-[11px] text-navy-400">Live demo checkout · sandbox provider</p>
    </div>
  );
};

const NewsletterForm: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [smsOptIn, setSmsOptIn] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error('Enter a valid business email address'); return; }
    setLoading(true);
    try {
      await fetch('https://famous.ai/api/crm/6aace01560554da1d744b64f/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, name: name || undefined, phone: phone || undefined, sms_opt_in: smsOptIn === true,
          source: 'footer-signup', tags: ['newsletter', 'merchant-interest'],
        }),
      });
      setDone(true);
      toast.success('Thank you — a BEYLO specialist will be in touch.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-white"><BadgeCheck className="h-4 w-4 text-gold-400" /> Request received</p>
        <p className="mt-1.5 text-[13px] text-navy-300">We’ll contact you within one business day to discuss limits and settlement.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-[14px] font-semibold text-white">Speak to our merchant team</p>
      <p className="mt-1 text-[12.5px] text-navy-300">Pricing, limits and onboarding for high-value businesses.</p>
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-navy-300">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="James Wilson" className="h-10 w-full rounded-md border border-white/15 bg-navy-900/60 px-3 text-sm text-white placeholder:text-navy-400 focus:border-gold-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-navy-300">Business email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.co.uk" className="h-10 w-full rounded-md border border-white/15 bg-navy-900/60 px-3 text-sm text-white placeholder:text-navy-400 focus:border-gold-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-navy-300">Phone number (optional)</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900123" className="h-10 w-full rounded-md border border-white/15 bg-navy-900/60 px-3 text-sm text-white placeholder:text-navy-400 focus:border-gold-500 focus:outline-none" />
        </div>
        <label className="flex items-start gap-2.5 text-[12px] text-navy-300">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent" />
          <span>Text me updates. Msg &amp; data rates may apply. Reply STOP to unsubscribe.</span>
        </label>
        <Button type="submit" variant="gold" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Request a call
        </Button>
      </div>
    </form>
  );
};

const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950">
        <img src={HERO} alt="Luxury showroom at dusk" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-950/92 to-navy-800/70" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-[11.5px] font-medium uppercase tracking-[0.14em] text-gold-400">
              <ShieldCheck className="h-3.5 w-3.5" /> UK payment platform
            </span>
            <h1 className="mt-5 text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-[44px] lg:text-[54px]">
              Accept six-figure payments.<br />
              <span className="text-gold-400">Settle in pounds.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-navy-300 sm:text-[16.5px]">
              BEYLO lets luxury dealerships, jewellers and premium retailers accept digital-asset payments from
              international clients — priced in GBP, quoted at a locked rate, and settled to your UK bank account.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button variant="gold" size="lg" onClick={() => navigate('/onboarding')}>Open a merchant account <ArrowRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="lg" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => navigate('/dashboard')}>
                Explore the dashboard
              </Button>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-6 border-t border-white/10 pt-7 sm:grid-cols-4">
              {[['£1.2bn+', 'Volume processed'], ['0.30%', 'From, per payment'], ['Next day', 'GBP settlement'], ['99.98%', 'Platform uptime']].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-[19px] font-semibold text-white sm:text-[22px]">{v}</dt>
                  <dd className="mt-0.5 text-[11.5px] uppercase tracking-[0.08em] text-navy-400">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:pl-6"><CheckoutPreview /></div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-6 md:px-6">
          {['Verified merchants only', 'Two-factor authentication', 'Append-only audit logs', 'Provider-locked FX rates', 'GBP settlement via Faster Payments'].map((t) => (
            <span key={t} className="flex items-center gap-2 text-[12.5px] font-medium text-navy-700">
              <Check className="h-3.5 w-3.5 text-finsuccess" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* Platform features */}
      <section id="platform" className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">The platform</p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.01em] text-navy-900 sm:text-[34px]">Built for transactions where mistakes are expensive</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-navy-400">
            Everything a finance team expects from a payment platform — with the operational safeguards required when a
            single transaction is worth more than most businesses take in a month.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6 transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900/5 text-navy-900"><f.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 text-[16px] font-semibold text-navy-900">{f.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-navy-400">{f.copy}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-line bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="overflow-hidden rounded-2xl border border-line">
              <img src={SHOWROOM} alt="Premium dealership showroom" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">How it works</p>
              <h2 className="mt-2 text-[28px] font-semibold text-navy-900 sm:text-[34px]">From invoice to settled GBP in four steps</h2>
              <ol className="mt-8 space-y-6">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="text-[13px] font-semibold tabular-nums text-gold-600">{s.n}</span>
                    <div className="border-l border-line pl-4">
                      <p className="text-[15.5px] font-semibold text-navy-900">{s.title}</p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-navy-400">{s.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => navigate('/dashboard/create-payment')}>Try creating a payment</Button>
                <Button variant="outline" onClick={() => navigate('/pay/BYL-240918-004')}>View customer checkout</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Industries</p>
            <h2 className="mt-2 text-[28px] font-semibold text-navy-900 sm:text-[34px]">Trusted with high-value commerce</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-navy-400">
              BEYLO is designed for businesses whose average transaction is measured in tens or hundreds of thousands of pounds.
            </p>
          </div>
          <Badge tone="gold">Typical transaction values</Badge>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRY_CARDS.map((c) => (
            <Card key={c.title} className="flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-100 text-gold-700"><c.icon className="h-5 w-5" /></span>

              <h3 className="mt-3.5 text-[15px] font-semibold text-navy-900">{c.title}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-navy-400">{c.copy}</p>
              <p className="mt-3 border-t border-line pt-3 text-[13px] font-semibold tabular-nums text-navy-900">{c.typical}<span className="ml-1 text-[11.5px] font-normal text-navy-400">typical</span></p>
            </Card>
          ))}
        </div>
      </section>

      {/* Settlement */}
      <section id="settlement" className="bg-navy-900 py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 md:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-400">Settlement</p>
            <h2 className="mt-2 text-[28px] font-semibold text-white sm:text-[34px]">You never hold crypto. Ever.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-navy-300">
              Your customer pays in digital assets. BEYLO’s regulated payment infrastructure provider handles conversion,
              liquidity and payout. You receive a clean GBP settlement with full reconciliation — the same way you would
              from a card acquirer.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[['Gross', gbp(124500)], ['Fees', gbp(373.5)], ['Net settlement', gbp(124126.5)]].map(([l, v], i) => (
                <div key={l} className={`rounded-lg border p-4 ${i === 2 ? 'border-gold-500/40 bg-gold-500/10' : 'border-white/10 bg-white/5'}`}>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-navy-400">{l}</p>
                  <p className={`mt-1 text-[17px] font-semibold tabular-nums ${i === 2 ? 'text-gold-300' : 'text-white'}`}>{v}</p>
                </div>
              ))}
            </div>
            <Button variant="gold" className="mt-8" onClick={() => navigate('/dashboard/settlements')}>See settlement reporting</Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <img src={WATCH} alt="Luxury timepiece" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Pricing</p>
          <h2 className="mt-2 text-[28px] font-semibold text-navy-900 sm:text-[34px]">Transparent, volume-based pricing</h2>
          <p className="mt-3 text-[15px] text-navy-400">No setup fees. No monthly minimums during your first quarter.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            { name: 'Standard', rate: '0.50%', note: 'Up to £250,000 monthly volume', features: ['Hosted checkout', 'GBP next-day settlement', 'Up to 5 team members', 'CSV exports'] },
            { name: 'Professional', rate: '0.35%', note: '£250,000 – £1m monthly volume', features: ['Everything in Standard', 'Unlimited team members', 'Role-based permissions', 'Priority support'], featured: true },
            { name: 'Enterprise', rate: 'Custom', note: '£1m+ monthly volume', features: ['Dedicated account manager', 'Custom settlement schedule', 'Bespoke risk limits', 'Implementation support'] },
          ].map((p) => (
            <Card key={p.name} className={`flex h-full flex-col p-6 ${p.featured ? 'border-gold-500/50 ring-1 ring-gold-500/30' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-navy-900">{p.name}</h3>
                {p.featured && <Badge tone="gold">Most popular</Badge>}
              </div>
              <p className="mt-4 text-[34px] font-semibold tracking-[-0.02em] text-navy-900">{p.rate}</p>
              <p className="mt-1 text-[12.5px] text-navy-400">{p.note}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13.5px] text-navy-700"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-finsuccess" /> {f}</li>
                ))}
              </ul>
              <Button variant={p.featured ? 'gold' : 'outline'} className="mt-6 w-full" onClick={() => navigate('/onboarding')}>
                {p.name === 'Enterprise' ? 'Contact sales' : 'Get started'}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-navy-950 pt-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_2fr_1.3fr]">
            <div>
              <BeyloLogo tone="light" />
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-navy-400">
                BEYLO is a UK payment platform for high-value commerce. Cryptocurrency processing, conversion and GBP
                settlement are performed by our regulated payment infrastructure provider.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge tone="neutral" className="border-white/10 bg-white/5 text-navy-300">Registered in England &amp; Wales</Badge>
                <Badge tone="neutral" className="border-white/10 bg-white/5 text-navy-300">GBP settlement</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {[
                { title: 'Platform', links: [['Merchant dashboard', '/dashboard'], ['Create payment', '/dashboard/create-payment'], ['Transactions', '/dashboard/transactions'], ['Settlements', '/dashboard/settlements'], ['Reports', '/dashboard/reports']] },
                { title: 'Company', links: [['Open an account', '/onboarding'], ['Sign in', '/signin'], ['Documentation', '/docs'], ['Support', '/dashboard/support'], ['Admin portal', '/admin']] },
                { title: 'Resources', links: [['Customer checkout', '/pay/BYL-240918-004'], ['Team management', '/dashboard/team'], ['Security settings', '/dashboard/settings'], ['Webhook events', '/admin/webhooks'], ['Audit logs', '/admin/audit']] },
              ].map((col) => (
                <div key={col.title}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-400">{col.title}</p>
                  <ul className="mt-4 space-y-2.5">
                    {col.links.map(([label, to]) => (
                      <li key={to}><Link to={to} className="text-[13px] text-navy-300 transition hover:text-white">{label}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <NewsletterForm />
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 py-6 text-[12px] text-navy-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 BEYLO Payments Ltd. All rights reserved.</p>
            <div className="flex flex-wrap gap-5">
              <Link to="/docs" className="hover:text-white">Terms of Service</Link>
              <Link to="/docs" className="hover:text-white">Privacy Policy</Link>
              <Link to="/docs" className="hover:text-white">Acceptable Use</Link>
              <span>Sandbox environment</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
