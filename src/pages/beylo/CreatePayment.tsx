import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, PageHeader, PermissionDenied } from '@/components/beylo/AppShell';
import {
  Button,
  Card,
  CardHeader,
  CopyButton,
  Input,
  Label,
  Modal,
  Money,
  Select,
  Textarea,
  Badge,
} from '@/components/beylo/primitives';
import QRCode from '@/components/beylo/QRCode';
import { paymentProvider, ProviderPayment } from '@/lib/beylo/provider';
import { gbp } from '@/lib/beylo/format';
import { useAuth } from '@/contexts/AuthContext';
import { Info, Loader2, PlusCircle, ShieldCheck, ExternalLink, Send } from 'lucide-react';
import { toast } from 'sonner';

const EXPIRY_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 1440, label: '24 hours' },
];

const CreatePayment: React.FC = () => {
  const navigate = useNavigate();
  const { can, displayName, profile } = useAuth();
  const [amount, setAmount] = React.useState('50,000.00');
  const [reference, setReference] = React.useState('INV-2026-00482');
  const [description, setDescription] = React.useState('2026 Range Rover Autobiography');
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [expiry, setExpiry] = React.useState(60);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [created, setCreated] = React.useState<ProviderPayment | null>(null);
  const [sendOpen, setSendOpen] = React.useState(false);

  const numericAmount = Number(amount.replace(/[^0-9.]/g, '')) || 0;

  const formatAmount = (raw: string) => {
    const clean = raw.replace(/[^0-9.]/g, '');
    const [int, dec] = clean.split('.');
    const grouped = int ? Number(int).toLocaleString('en-GB') : '';
    return dec !== undefined ? `${grouped}.${dec.slice(0, 2)}` : grouped;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (numericAmount < 1) next.amount = 'Enter a payment amount in GBP';
    if (numericAmount > 1_000_000) next.amount = 'Amounts above £1,000,000 require BEYLO pre-approval';
    if (!reference.trim()) next.reference = 'A payment reference is required';
    if (customerEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)) next.customerEmail = 'Enter a valid email address';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const payment = await paymentProvider.createPayment({
        gbpAmount: numericAmount,
        reference,
        description,
        customerName,
        customerEmail,
        expiryMinutes: expiry,
      });
      setCreated(payment);
      toast.success('Secure payment created');
    } catch {
      toast.error('Provider unavailable — please retry');
    } finally {
      setLoading(false);
    }
  };

  const link = created ? `pay.beylo.co.uk/p/${created.paymentId}` : '';
  const checkoutPath = created ? `/pay/${created.paymentId}?amount=${numericAmount}&ref=${encodeURIComponent(reference)}&desc=${encodeURIComponent(description)}` : '';

  if (!can('Create Payments')) {
    return (
      <AppShell title="Create a secure payment request">
        <PageHeader eyebrow="Payments" title="Create Payment" />
        <PermissionDenied permission="Create Payments" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Create a secure payment request">
      <PageHeader
        eyebrow="Payments"
        title="Create Payment"
        description={`Creating as ${displayName}${profile ? ` · ${profile.role}` : ''}`}
        actions={<Button variant="outline" onClick={() => navigate('/dashboard/transactions')}>Transactions</Button>}
      />


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Transaction Amount" description="The amount your customer will pay in GBP" />
            <div className="p-5">
              <Label htmlFor="amount" hint="Currency: GBP">Payment Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[28px] font-semibold text-navy-400">£</span>
                <input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(formatAmount(e.target.value))}
                  placeholder="50,000.00"
                  className="h-[72px] w-full rounded-lg border border-line bg-white pl-11 pr-24 text-[32px] font-semibold tabular-nums tracking-[-0.02em] text-navy-900 placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-900/10 md:text-[38px]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-line bg-canvas px-2.5 py-1 text-[12px] font-semibold text-navy-700">GBP</span>
              </div>
              {errors.amount && <p className="mt-2 text-[12.5px] text-finerror">{errors.amount}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {[25000, 50000, 120000, 250000].map((v) => (
                  <button key={v} type="button" onClick={() => setAmount(v.toLocaleString('en-GB') + '.00')} className="rounded-full border border-line px-3 py-1 text-[12.5px] text-navy-700 hover:border-navy-300 hover:bg-canvas">
                    {gbp(v, false)}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Payment Details" description="Reference shown to your customer and on settlement reports" />
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <div className="md:col-span-1">
                <Label htmlFor="reference" hint="Required">Payment Reference</Label>
                <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-2026-00482" />
                {errors.reference && <p className="mt-1.5 text-[12.5px] text-finerror">{errors.reference}</p>}
                <p className="mt-1.5 text-[12px] text-navy-400">Vehicle registration, invoice, order or customer reference.</p>
              </div>
              <div>
                <Label htmlFor="expiry">Payment Expiry</Label>
                <Select id="expiry" value={expiry} onChange={(e) => setExpiry(Number(e.target.value))}>
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
                <p className="mt-1.5 text-[12px] text-navy-400">The crypto quote has a shorter provider-controlled expiry.</p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description" hint="Optional">Description</Label>
                <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="2026 Range Rover Autobiography" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Customer Details" description="Optional — used for receipts and payment links" />
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <div>
                <Label htmlFor="cname" hint="Optional">Customer Name</Label>
                <Input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="A. Thornbury" />
              </div>
              <div>
                <Label htmlFor="cemail" hint="Optional">Customer Email</Label>
                <Input id="cemail" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.co.uk" />
                {errors.customerEmail && <p className="mt-1.5 text-[12.5px] text-finerror">{errors.customerEmail}</p>}
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-[12.5px] text-navy-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-finsuccess" />
              Crypto quoting, wallets and GBP settlement are handled server-side by the payment infrastructure provider.
            </p>
            <Button type="submit" variant="gold" size="lg" disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              {loading ? 'Creating payment…' : 'Create Secure Payment'}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-400">Customer will pay</p>
            <div className="mt-2"><Money size="lg">{gbp(numericAmount)}</Money></div>
            <p className="mt-1 text-[13px] text-navy-400">GBP · settled to {`•••• 4821`}</p>
            <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between"><dt className="text-navy-400">Reference</dt><dd className="font-medium text-navy-900">{reference || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-400">Session expiry</dt><dd className="font-medium text-navy-900">{EXPIRY_OPTIONS.find((o) => o.value === expiry)?.label}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-400">Est. BEYLO fee (0.30%)</dt><dd className="font-medium text-navy-900">{gbp(numericAmount * 0.003)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2.5"><dt className="text-navy-400">Est. net settlement</dt><dd className="font-semibold text-navy-900">{gbp(numericAmount - numericAmount * 0.003)}</dd></div>
            </dl>
          </Card>

          <Card className="border-gold-500/30 bg-gold-100/60 p-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-gold-700"><Info className="h-4 w-4" /> How the quote works</p>
            <ul className="mt-2.5 space-y-2 text-[12.5px] leading-relaxed text-navy-700">
              <li>Your customer selects a supported asset at checkout.</li>
              <li>BEYLO requests a live crypto/GBP quote from the provider.</li>
              <li>The rate is locked by the provider for a short window only.</li>
              <li>BEYLO never sets or holds market rates independently.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Payment created */}
      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCreated(null); setReference(''); setDescription(''); setAmount(''); }}>
              Create Another Payment
            </Button>
            <Button variant="primary" onClick={() => navigate('/dashboard/transactions')}>View Payment</Button>
          </>
        }
      >
        {created && (
          <div>
            <div className="text-center">
              <Badge tone="success" dot>Payment Created</Badge>
              <div className="mt-3"><Money size="xl">{gbp(numericAmount)}</Money></div>
              <p className="mt-1 text-[13px] text-navy-400">GBP · awaiting customer payment</p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
              <div className="flex justify-center">
                <QRCode value={link} size={170} />
              </div>
              <div>
                <dl className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between gap-3"><dt className="text-navy-400">Payment ID</dt><dd className="font-mono font-medium text-navy-900">{created.paymentId}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-navy-400">Reference</dt><dd className="font-medium text-navy-900">{reference || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-navy-400">Provider payment</dt><dd className="font-mono text-[12px] text-navy-700">{created.providerPaymentId}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-navy-400">Session expires</dt><dd className="font-medium text-navy-900">{new Date(created.expiresAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</dd></div>
                </dl>
                <div className="mt-3 rounded-md border border-line bg-canvas px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-navy-400">Customer payment link</p>
                  <p className="mt-0.5 break-all font-mono text-[12.5px] text-navy-900">{link}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton value={`https://${link}`} label="Copy Payment Link" />
                  <Button size="sm" variant="primary" onClick={() => navigate(checkoutPath)}>
                    <ExternalLink className="h-3.5 w-3.5" /> Open Checkout
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSendOpen(true)}>
                    <Send className="h-3.5 w-3.5" /> Send to Customer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <SendToCustomerModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        defaultEmail={customerEmail}
        defaultName={customerName}
        link={link}
        amount={numericAmount}
      />
    </AppShell>
  );
};

const SendToCustomerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultEmail: string;
  defaultName: string;
  link: string;
  amount: number;
}> = ({ open, onClose, defaultEmail, defaultName, link, amount }) => {
  const [email, setEmail] = React.useState(defaultEmail);
  const [name, setName] = React.useState(defaultName);
  const [phone, setPhone] = React.useState('');
  const [smsOptIn, setSmsOptIn] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => { setEmail(defaultEmail); setName(defaultName); }, [defaultEmail, defaultName, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Enter a valid customer email address');
      return;
    }
    setSending(true);
    try {
      await fetch('https://famous.ai/api/crm/6aace01560554da1d744b64f/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || undefined,
          phone: phone || undefined,
          sms_opt_in: smsOptIn === true,
          source: 'payment-link-send',
          tags: ['payment-link', 'merchant-customer'],
        }),
      });
      toast.success(`Payment link sent to ${email}`);
      onClose();
    } catch {
      toast.error('Unable to send payment link');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Send payment link" description={`${gbp(amount)} · ${link}`}>
      <form onSubmit={send} className="space-y-4">
        <div>
          <Label htmlFor="sc-name" hint="Optional">Customer name</Label>
          <Input id="sc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="A. Thornbury" />
        </div>
        <div>
          <Label htmlFor="sc-email">Email address</Label>
          <Input id="sc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.co.uk" />
        </div>
        <div>
          <Label htmlFor="sc-phone">Phone number (optional)</Label>
          <Input id="sc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900123" />
        </div>
        <label className="flex items-start gap-2.5 text-[12.5px] text-navy-700">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line text-navy-900" />
          <span>Text me updates. Msg &amp; data rates may apply. Reply STOP to unsubscribe.</span>
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gold" disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send link
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreatePayment;
