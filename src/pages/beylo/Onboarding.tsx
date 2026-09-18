import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, BeyloLogo, Button, Card, Input, Label, Select } from '@/components/beylo/primitives';
import { AMOUNT_BANDS, INDUSTRIES } from '@/lib/beylo/types';
import { buildMerchantId } from '@/lib/beylo/ledger';
import { saveOnboardingDraft } from '@/contexts/AuthContext';
import { Check, ChevronLeft, ChevronRight, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  'Business Details',
  'Registered Address',
  'Business Representative',
  'Expected Payment Activity',
  'Settlement Information',
  'Verification Status',
];

type Form = Record<string, string>;

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Form>({});
  const [form, setForm] = React.useState<Form>({
    legalName: '', tradingName: '', registrationNumber: '', country: 'United Kingdom',
    businessType: 'Private Limited Company', industry: 'Automotive', website: '',
    line1: '', line2: '', city: '', county: '', postcode: '', addressCountry: 'United Kingdom',
    firstName: '', lastName: '', jobTitle: '', email: '', phone: '',
    avgTransaction: AMOUNT_BANDS[2], maxTransaction: AMOUNT_BANDS[4], monthlyVolume: '£250,000 – £500,000', txCount: '10–25',
    accountHolder: '', sortCode: '', accountNumber: '',
    smsOptIn: 'true',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Form = {};
    if (step === 0) {
      if (!form.legalName.trim()) e.legalName = 'Required';
      if (!form.registrationNumber.trim()) e.registrationNumber = 'Required';
    }
    if (step === 1) {
      if (!form.line1.trim()) e.line1 = 'Required';
      if (!form.city.trim()) e.city = 'Required';
      if (!form.postcode.trim()) e.postcode = 'Required';
    }
    if (step === 2) {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim()) e.lastName = 'Required';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Enter a valid email address';
    }
    if (step === 4) {
      if (!form.accountHolder.trim()) e.accountHolder = 'Required';
      if (!/^\d{2}-?\d{2}-?\d{2}$/.test(form.sortCode)) e.sortCode = 'Enter a 6-digit sort code';
      if (!/^\d{8}$/.test(form.accountNumber)) e.accountNumber = 'Enter an 8-digit account number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!validate()) return;
    if (step === 4) {
      setSubmitting(true);
      const merchantId = buildMerchantId();
      saveOnboardingDraft({
        ...form,
        merchantId,
      });
      await fetch('https://famous.ai/api/crm/6aace01560554da1d744b64f/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          name: `${form.firstName} ${form.lastName}`.trim() || undefined,
          phone: form.phone || undefined,
          sms_opt_in: form.smsOptIn === 'true',
          source: 'merchant-onboarding',
          tags: ['merchant-application', form.industry.toLowerCase()],
        }),
      }).catch(() => undefined);
      setSubmitting(false);
      toast.success('Application submitted for verification');
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const err = (k: string) => errors[k] && <p className="mt-1.5 text-[12px] text-finerror">{errors[k]}</p>;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <BeyloLogo subtitle="Merchant Onboarding" />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-[12.5px] text-navy-400 sm:flex"><Lock className="h-3.5 w-3.5" /> Encrypted application</span>
            <Link to="/signin"><Button variant="outline" size="sm">Sign in</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">Application</p>
          <h1 className="mt-1 text-[26px] font-semibold text-navy-900">Open a BEYLO merchant account</h1>
          <p className="mt-1 text-sm text-navy-400">Verification typically completes within 1–2 business days for UK registered companies.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <ol className="space-y-1">
            {STEPS.map((s, i) => (
              <li key={s}>
                <button
                  onClick={() => i <= step && setStep(i)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                    i === step ? 'border-navy-900 bg-white' : i < step ? 'border-line bg-white hover:border-navy-300' : 'border-transparent bg-transparent'
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    i < step ? 'border-finsuccess bg-finsuccess text-white' : i === step ? 'border-navy-900 text-navy-900' : 'border-line text-navy-300'
                  }`}>
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className={`text-[13px] font-medium ${i <= step ? 'text-navy-900' : 'text-navy-300'}`}>{s}</span>
                </button>
              </li>
            ))}
          </ol>

          <Card className="p-5 md:p-6">
            <h2 className="text-[17px] font-semibold text-navy-900">{STEPS[step]}</h2>

            {step === 0 && (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><Label>Business legal name</Label><Input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} placeholder="Prestige Automotive London Ltd" />{err('legalName')}</div>
                <div><Label>Trading name</Label><Input value={form.tradingName} onChange={(e) => set('tradingName', e.target.value)} placeholder="Prestige Automotive London" /></div>
                <div><Label>Company registration number</Label><Input value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} placeholder="09482613" />{err('registrationNumber')}</div>
                <div><Label>Country</Label><Select value={form.country} onChange={(e) => set('country', e.target.value)}><option>United Kingdom</option><option>Ireland</option><option>Jersey</option><option>Guernsey</option></Select></div>
                <div><Label>Business type</Label><Select value={form.businessType} onChange={(e) => set('businessType', e.target.value)}><option>Private Limited Company</option><option>Public Limited Company</option><option>Limited Liability Partnership</option><option>Sole Trader</option></Select></div>
                <div><Label>Industry</Label><Select value={form.industry} onChange={(e) => set('industry', e.target.value)}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</Select></div>
                <div className="sm:col-span-2"><Label>Website</Label><Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="prestigeautomotive.co.uk" /></div>
              </div>
            )}

            {step === 1 && (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Address Line 1</Label><Input value={form.line1} onChange={(e) => set('line1', e.target.value)} placeholder="48 Berkeley Square" />{err('line1')}</div>
                <div className="sm:col-span-2"><Label>Address Line 2</Label><Input value={form.line2} onChange={(e) => set('line2', e.target.value)} placeholder="Mayfair" /></div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="London" />{err('city')}</div>
                <div><Label>County / Region</Label><Input value={form.county} onChange={(e) => set('county', e.target.value)} placeholder="Greater London" /></div>
                <div><Label>Postcode</Label><Input value={form.postcode} onChange={(e) => set('postcode', e.target.value)} placeholder="W1J 5AX" />{err('postcode')}</div>
                <div><Label>Country</Label><Select value={form.addressCountry} onChange={(e) => set('addressCountry', e.target.value)}><option>United Kingdom</option><option>Ireland</option></Select></div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><Label>First Name</Label><Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="James" />{err('firstName')}</div>
                <div><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Wilson" />{err('lastName')}</div>
                <div><Label>Job Title</Label><Input value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="Managing Director" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@company.co.uk" />{err('email')}</div>
                <div><Label>Phone number (optional)</Label><Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+44 20 7946 0812" /></div>
                <label className="flex items-start gap-2.5 text-[12.5px] text-navy-700 sm:col-span-2">
                  <input type="checkbox" checked={form.smsOptIn === 'true'} onChange={(e) => set('smsOptIn', String(e.target.checked))} className="mt-0.5 h-4 w-4 rounded border-line" />
                  <span>Text me updates about my application. Msg &amp; data rates may apply. Reply STOP to unsubscribe.</span>
                </label>
                <p className="text-[12px] text-navy-400 sm:col-span-2">
                  Representative identity checks (KYC) will be completed through BEYLO’s verification provider after submission.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><Label>Average transaction size</Label><Select value={form.avgTransaction} onChange={(e) => set('avgTransaction', e.target.value)}>{AMOUNT_BANDS.map((b) => <option key={b}>{b}</option>)}</Select></div>
                <div><Label>Maximum expected transaction size</Label><Select value={form.maxTransaction} onChange={(e) => set('maxTransaction', e.target.value)}>{AMOUNT_BANDS.map((b) => <option key={b}>{b}</option>)}</Select></div>
                <div><Label>Estimated monthly payment volume</Label><Select value={form.monthlyVolume} onChange={(e) => set('monthlyVolume', e.target.value)}><option>Under £100,000</option><option>£100,000 – £250,000</option><option>£250,000 – £500,000</option><option>£500,000 – £1,000,000</option><option>£1,000,000+</option></Select></div>
                <div><Label>Expected number of transactions / month</Label><Select value={form.txCount} onChange={(e) => set('txCount', e.target.value)}><option>1–10</option><option>10–25</option><option>25–50</option><option>50–100</option><option>100+</option></Select></div>
                <p className="text-[12px] text-navy-400 sm:col-span-2">
                  Expected activity informs risk limits. Limits can be reviewed once your account has trading history.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><Label>Settlement currency</Label><Input value="GBP" readOnly className="bg-canvas" /></div>
                <div><Label>Account Holder Name</Label><Input value={form.accountHolder} onChange={(e) => set('accountHolder', e.target.value)} placeholder="Prestige Automotive London Ltd" />{err('accountHolder')}</div>
                <div><Label>Sort Code</Label><Input value={form.sortCode} onChange={(e) => set('sortCode', e.target.value)} placeholder="20-45-77" />{err('sortCode')}</div>
                <div><Label>Account Number</Label><Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="12344821" />{err('accountNumber')}</div>
                <div className="rounded-lg border border-line bg-canvas px-4 py-3 sm:col-span-2">
                  <p className="flex items-center gap-2 text-[12.5px] font-medium text-navy-900"><ShieldCheck className="h-4 w-4 text-finsuccess" /> Bank details are handled securely</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-navy-400">
                    Banking information is tokenised and stored by BEYLO’s regulated payment infrastructure provider.
                    BEYLO retains only a masked reference for reconciliation.
                  </p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="mt-5">
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-canvas px-4 py-4">
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-navy-900">Business Verification</p>
                    <p className="text-[12.5px] text-navy-400">{form.legalName || 'Your business'} · {form.industry}</p>
                  </div>
                  <Badge tone="warn" dot pulse>Pending Review</Badge>
                </div>

                <ol className="mt-5">
                  {[
                    ['Application submitted', 'Complete', 'All required information received'],
                    ['Company registry check', 'In progress', 'Companies House verification'],
                    ['Representative identity (KYC)', 'Pending', 'Awaiting identity verification'],
                    ['Settlement account validation', 'Pending', 'Bank account confirmation with provider'],
                    ['Account activation', 'Pending', 'Payment limits applied on approval'],
                  ].map(([t, s, d], i) => (
                    <li key={t} className="relative flex gap-3 pb-5 last:pb-0">
                      {i < 4 && <span className={`absolute left-[11px] top-6 h-full w-px ${s === 'Complete' ? 'bg-finsuccess/40' : 'bg-line'}`} />}
                      <span className={`relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border ${
                        s === 'Complete' ? 'border-finsuccess bg-finsuccess text-white' : s === 'In progress' ? 'border-finwarn bg-finwarn-soft text-finwarn' : 'border-line bg-white text-navy-300'
                      }`}>
                        {s === 'Complete' ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                      </span>
                      <div>
                        <p className="text-[13.5px] font-medium text-navy-900">{t}</p>
                        <p className="text-[12.5px] text-navy-400">{d}</p>
                      </div>
                      <Badge tone={s === 'Complete' ? 'success' : s === 'In progress' ? 'warn' : 'neutral'} className="ml-auto self-start">{s}</Badge>
                    </li>
                  ))}
                </ol>

                <div className="mt-2 rounded-lg border border-gold-500/30 bg-gold-100/60 px-4 py-3 text-[12.5px] text-navy-700">
                  Verification outcomes: <strong>Pending Review</strong>, <strong>Information Required</strong>,
                  <strong> Verified</strong> or <strong>Rejected</strong>. You’ll be notified by email at each change.
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={() => navigate(`/signin?mode=register&from=onboarding`)}
                  >
                    Create your merchant login
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => navigate('/signin')}>Back to sign in</Button>
                </div>
              </div>
            )}

            {step < 5 && (
              <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] text-navy-400">Step {step + 1} of {STEPS.length}</span>
                  <Button variant="primary" onClick={next} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {step === 4 ? 'Submit application' : 'Continue'} <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
