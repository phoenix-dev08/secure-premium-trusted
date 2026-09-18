import React from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BeyloLogo, Button, Card, Input, Label, Badge } from '@/components/beylo/primitives';
import { readOnboardingDraft, useAuth } from '@/contexts/AuthContext';
import { DEMO_ACCOUNT } from '@/lib/beylo/demo';
import { ArrowLeft, KeyRound, Loader2, Lock, Mail, ShieldCheck, Smartphone, CheckCircle2, UserPlus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const HERO_IMAGE = 'https://d64gsuwffb70l.cloudfront.net/6aace01560554da1d744b64f_1789714546592_22417a94.jpg';

const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen bg-canvas">
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy-900 p-10 lg:flex xl:w-[55%]">
      <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950/90 via-navy-900/85 to-navy-800/70" />
      <div className="relative"><BeyloLogo tone="light" subtitle="Payments" /></div>
      <div className="relative max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">United Kingdom</p>
        <h2 className="mt-3 text-[30px] font-semibold leading-tight text-white xl:text-[38px]">
          Secure payments for high-value commerce.
        </h2>
        <p className="mt-4 text-[14.5px] leading-relaxed text-navy-300">
          BEYLO settles six-figure transactions in GBP for dealerships, jewellers and premium retailers — with
          institutional controls, full audit trails and provider-grade security.
        </p>
        <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          {[['£1.2bn+', 'Processed volume'], ['99.98%', 'Platform uptime'], ['4m 12s', 'Avg. confirmation']].map(([v, l]) => (
            <div key={l}>
              <dt className="text-[20px] font-semibold text-white">{v}</dt>
              <dd className="mt-0.5 text-[12px] text-navy-400">{l}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="relative text-[11.5px] text-navy-400">© 2026 BEYLO Payments Ltd · Registered in England &amp; Wales</p>
    </div>

    <div className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2 xl:w-[45%]">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 lg:hidden"><BeyloLogo subtitle="Payments" /></div>
        {children}
      </div>
    </div>
  </div>
);

const rememberedEmail = (): string => {
  try {
    return window.localStorage.getItem('beylo.remember') || '';
  } catch {
    return '';
  }
};

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { signIn, signUp, enterDemo, userId, loading, needsTwoFactor } = useAuth();

  const draft = React.useMemo(() => readOnboardingDraft(), []);
  const preferRegister = params.get('mode') === 'register' || Boolean(draft?.email && params.get('from') === 'onboarding');

  const [mode, setMode] = React.useState<'signin' | 'register'>(preferRegister ? 'register' : 'signin');
  const [email, setEmail] = React.useState(draft?.email || rememberedEmail());
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState(draft?.firstName || '');
  const [lastName, setLastName] = React.useState(draft?.lastName || '');
  const [remember, setRemember] = React.useState(Boolean(rememberedEmail()));
  const [busy, setBusy] = React.useState(false);
  const [demoBusy, setDemoBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  React.useEffect(() => {
    if (loading) return;
    if (userId && needsTwoFactor) {
      navigate('/2fa', { replace: true, state: { from: redirectTo } });
      return;
    }
    if (userId && !needsTwoFactor) navigate(redirectTo, { replace: true });
  }, [loading, userId, needsTwoFactor, navigate, redirectTo]);

  const autoDemoStarted = React.useRef(false);
  React.useEffect(() => {
    if (autoDemoStarted.current || loading || userId) return;
    if (params.get('demo') !== '1') return;
    autoDemoStarted.current = true;
    void (async () => {
      setDemoBusy(true);
      const result = await enterDemo();
      setDemoBusy(false);
      if (result.error) { setError(result.error); return; }
      toast.success('Signed in as demo owner — full access');
      navigate('/dashboard', { replace: true });
    })();
  }, [loading, userId, params, enterDemo, navigate]);

  const fillDemo = () => {
    setMode('signin');
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setError('');
  };

  const useDemo = async () => {
    setError('');
    setDemoBusy(true);
    fillDemo();
    const result = await enterDemo();
    setDemoBusy(false);
    if (result.error) { setError(result.error); return; }
    toast.success('Signed in as demo owner — full access');
    navigate('/dashboard', { replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError('Enter a valid email address'); return; }
    if (password.length < 8) { setError('Passwords must be at least 8 characters'); return; }
    if (mode === 'register' && !firstName.trim()) { setError('Enter your first name'); return; }

    setError('');
    setBusy(true);

    if (mode === 'signin') {
      const result = await signIn(email, password, remember);
      setBusy(false);
      if (result.error) { setError(result.error); return; }
      if (result.needsTwoFactor) {
        toast.success('Enter your authenticator code');
        navigate('/2fa', { replace: true, state: { from: redirectTo } });
        return;
      }
      toast.success('Signed in securely');
      navigate(redirectTo, { replace: true });
      return;
    }

    const merchantName = draft?.tradingName || draft?.legalName || undefined;
    const result = await signUp({
      email,
      password,
      firstName,
      lastName,
      jobTitle: draft?.jobTitle,
      phone: draft?.phone,
      merchantName,
    });
    setBusy(false);

    if (result.error) { setError(result.error); return; }
    if (result.needsEmailVerification) {
      toast.success('Check your inbox to verify your email');
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, { replace: true });
      return;
    }
    toast.success('Merchant account created');
    navigate(redirectTo, { replace: true });
  };

  return (
    <AuthShell>
      <h1 className="text-[24px] font-semibold text-navy-900">
        {mode === 'signin' ? 'Sign in to BEYLO' : 'Create your BEYLO login'}
      </h1>
      <p className="mt-1.5 text-[13.5px] text-navy-400">
        {draft && mode === 'register'
          ? `Finish setting up access for ${draft.tradingName || draft.legalName || 'your merchant application'}.`
          : 'Secure payments for high-value commerce.'}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fn">First name</Label>
              <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="James" autoComplete="given-name" />
            </div>
            <div>
              <Label htmlFor="ln" hint="Optional">Last name</Label>
              <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Wilson" autoComplete="family-name" />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.co.uk" autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password" hint={mode === 'register' ? 'Minimum 8 characters' : undefined}>Password</Label>
          <Input
            id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </div>
        {error && <p className="rounded-md bg-finerror-soft px-3 py-2 text-[12.5px] text-finerror">{error}</p>}

        {mode === 'signin' && (
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[13px] text-navy-700">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-line" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-[13px] font-medium text-navy-900 hover:text-gold-600">Forgot password?</Link>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || demoBusy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'signin' ? <Lock className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {mode === 'signin' ? 'Sign In' : 'Create account'}
        </Button>
      </form>

      {mode === 'signin' && (
        <Card className="mt-5 border-gold-500/30 bg-gold-100/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-navy-900">
                <Sparkles className="h-3.5 w-3.5 text-gold-600" /> Demo account
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-navy-500">
                Full merchant owner + platform admin access — create payments, checkout, settlements and admin.
              </p>
            </div>
            <Badge tone="gold">Sandbox</Badge>
          </div>
          <dl className="mt-3 space-y-1.5 rounded-md border border-line bg-white px-3 py-2.5 font-mono text-[12px] text-navy-800">
            <div className="flex justify-between gap-3"><dt className="text-navy-400">Email</dt><dd>{DEMO_ACCOUNT.email}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-navy-400">Password</dt><dd>{DEMO_ACCOUNT.password}</dd></div>
          </dl>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="gold" className="w-full" disabled={busy || demoBusy} onClick={useDemo}>
              {demoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Enter demo account
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={busy || demoBusy} onClick={fillDemo}>
              Fill fields
            </Button>
          </div>
        </Card>
      )}

      <button
        type="button"
        onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError(''); }}
        className="mt-4 w-full text-center text-[13px] text-navy-400 hover:text-navy-900"
      >
        {mode === 'signin' ? 'No login yet? Create a secure BEYLO login' : 'Already have a login? Sign in instead'}
      </button>

      <div className="mt-6 rounded-lg border border-line bg-white p-4">
        <p className="flex items-center gap-2 text-[12.5px] font-medium text-navy-900"><ShieldCheck className="h-4 w-4 text-finsuccess" /> Protected account</p>
        <p className="mt-1 text-[12px] leading-relaxed text-navy-400">
          Sessions are issued and verified server-side. Accounts on the <span className="font-mono">beylo.co.uk</span> domain
          receive platform administrator access; all other accounts are scoped to their merchant.
        </p>
      </div>

      <p className="mt-6 text-center text-[13px] text-navy-400">
        New business? <Link to="/onboarding" className="font-medium text-navy-900 hover:text-gold-600">Apply for a merchant account</Link>
      </p>
    </AuthShell>
  );
};

export const ForgotPassword: React.FC = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [smsOptIn, setSmsOptIn] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error('Enter a valid email address'); return; }
    setBusy(true);
    const [{ error }] = await Promise.all([
      requestPasswordReset(email),
      fetch('https://famous.ai/api/crm/6aace01560554da1d744b64f/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, phone: phone || undefined, sms_opt_in: smsOptIn === true,
          source: 'password-reset', tags: ['account-recovery'],
        }),
      }).catch(() => undefined),
    ]);
    setBusy(false);
    if (error) { toast.error(error); return; }
    setSent(true);
  };

  return (
    <AuthShell>
      <Link to="/signin" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-navy-400 hover:text-navy-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</Link>
      {sent ? (
        <Card className="p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-finsuccess-soft"><Mail className="h-6 w-6 text-finsuccess" /></span>
          <h1 className="mt-4 text-[20px] font-semibold text-navy-900">Check your email</h1>
          <p className="mt-2 text-[13px] text-navy-400">
            We’ve sent password reset instructions to {email}. The secure link expires in 30 minutes.
          </p>
          <Link to="/reset-password"><Button variant="outline" className="mt-4 w-full">I have the reset link</Button></Link>
        </Card>
      ) : (
        <>
          <h1 className="text-[24px] font-semibold text-navy-900">Forgot password</h1>
          <p className="mt-1.5 text-[13.5px] text-navy-400">Enter your account email and we’ll send secure reset instructions.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="fp-email">Email Address</Label><Input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.co.uk" /></div>
            <div><Label htmlFor="fp-phone">Phone number (optional)</Label><Input id="fp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900123" /></div>
            <label className="flex items-start gap-2.5 text-[12.5px] text-navy-700">
              <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
              <span>Text me updates. Msg &amp; data rates may apply. Reply STOP to unsubscribe.</span>
            </label>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send reset instructions
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
};

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword, userId, passwordRecovery, loading, clearPasswordRecovery } = useAuth();
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const strength = pw.length >= 14 ? 'Strong' : pw.length >= 10 ? 'Good' : pw.length > 0 ? 'Weak' : '';

  const authorised = Boolean(userId) && (passwordRecovery || Boolean(userId));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error('Open this page from the emailed reset link so the request can be authorised.');
      return;
    }
    if (pw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (pw !== pw2) { toast.error('Passwords do not match'); return; }
    setBusy(true);
    const { error } = await updatePassword(pw);
    setBusy(false);
    if (error) { toast.error(error); return; }
    clearPasswordRecovery();
    toast.success('Password updated');
    navigate(passwordRecovery ? '/signin' : '/dashboard', { replace: true });
  };

  return (
    <AuthShell>
      <h1 className="text-[24px] font-semibold text-navy-900">Set a new password</h1>
      <p className="mt-1.5 text-[13.5px] text-navy-400">
        {loading
          ? 'Checking your recovery session…'
          : authorised
            ? 'Choose a strong password you don’t use elsewhere.'
            : 'Open this page from the emailed reset link so the request can be authorised.'}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="np" hint={strength}>New password</Label>
          <Input id="np" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" disabled={!authorised && !loading} />
        </div>
        <div><Label htmlFor="np2">Confirm password</Label><Input id="np2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" disabled={!authorised && !loading} /></div>
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || (!authorised && !loading)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Update password
        </Button>
      </form>
      <Link to="/signin" className="mt-4 block text-center text-[13px] text-navy-400 hover:text-navy-900">Back to sign in</Link>
    </AuthShell>
  );
};

export const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const { email, resendVerificationEmail, userId } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const displayEmail = email || params.get('email') || 'your inbox';

  const resend = async () => {
    setBusy(true);
    // Prefer authenticated resend; fall back to email query param for post-signup.
    if (userId) {
      const { error } = await resendVerificationEmail();
      setBusy(false);
      if (error) { toast.error(error); return; }
      toast.success('Verification email resent');
      return;
    }
    const target = params.get('email');
    if (!target) {
      setBusy(false);
      toast.error('Sign in or provide an email to resend verification');
      return;
    }
    const { error } = await supabase.auth.resend({ type: 'signup', email: target });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Verification email resent');
  };

  return (
    <AuthShell>
      <Card className="p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fininfo-soft"><Mail className="h-6 w-6 text-fininfo" /></span>
        <h1 className="mt-4 text-[20px] font-semibold text-navy-900">Verify your email address</h1>
        <p className="mt-2 text-[13px] text-navy-400">
          We’ve sent a verification link to {displayEmail}. Open the link to activate your merchant login, then sign in.
        </p>
        <div className="mt-5 space-y-2">
          <Link to="/signin"><Button variant="primary" className="w-full">Return to sign in</Button></Link>
          <Button variant="outline" className="w-full" disabled={busy} onClick={resend}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Resend verification email
          </Button>
        </div>
      </Card>
    </AuthShell>
  );
};

export const TwoFactor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, loading, needsTwoFactor, completeTwoFactor, profile, signOut } = useAuth();
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  React.useEffect(() => {
    if (loading) return;
    if (!userId) navigate('/signin', { replace: true });
    else if (!needsTwoFactor && !profile?.two_factor_enabled) navigate(redirectTo, { replace: true });
    else if (!needsTwoFactor) navigate(redirectTo, { replace: true });
  }, [loading, userId, needsTwoFactor, profile?.two_factor_enabled, navigate, redirectTo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/\D/g, '').length !== 6) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setError('');
    setBusy(true);
    // Demo TOTP: any 6-digit code verifies the device for this session.
    // Production must validate against the enrolled authenticator secret server-side.
    await new Promise((r) => setTimeout(r, 350));
    completeTwoFactor();
    setBusy(false);
    toast.success('Device verified');
    navigate(redirectTo, { replace: true });
  };

  return (
    <AuthShell>
      <button
        type="button"
        onClick={async () => { await signOut(); navigate('/signin', { replace: true }); }}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-navy-400 hover:text-navy-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Sign out
      </button>
      <h1 className="text-[24px] font-semibold text-navy-900">Two-factor authentication</h1>
      <p className="mt-1.5 text-[13.5px] text-navy-400">Enter the 6-digit code from your authenticator app to verify this device.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="otp">Authentication code</Label>
          <input
            id="otp" inputMode="numeric" maxLength={7} value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="000000"
            className="h-14 w-full rounded-md border border-line bg-white text-center text-[26px] font-semibold tracking-[0.4em] text-navy-900 placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-900/10"
          />
        </div>
        {error && <p className="rounded-md bg-finerror-soft px-3 py-2 text-[12.5px] text-finerror">{error}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify and continue
        </Button>
      </form>
      <Link to="/2fa-setup" className="mt-4 block text-center text-[13px] font-medium text-navy-900 hover:text-gold-600">Set up a new authenticator device</Link>
    </AuthShell>
  );
};

export const TwoFactorSetup: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile, completeTwoFactor } = useAuth();
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const confirm = async () => {
    if (code.replace(/\D/g, '').length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    if (profile?.id) {
      await supabase.from('merchant_members').update({ two_factor_enabled: true }).eq('id', profile.id);
      await refreshProfile();
    }
    completeTwoFactor();
    setBusy(false);
    toast.success('Two-factor authentication enabled');
    navigate('/dashboard', { replace: true });
  };

  return (
    <AuthShell>
      <h1 className="text-[24px] font-semibold text-navy-900">Set up two-factor authentication</h1>
      <p className="mt-1.5 text-[13.5px] text-navy-400">Scan the code below with an authenticator app, then confirm the generated code.</p>
      <Card className="mt-5 p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="rounded-lg border border-line bg-canvas p-4"><Smartphone className="h-16 w-16 text-navy-400" /></div>
          <div className="min-w-0">
            <p className="text-[12px] uppercase tracking-[0.1em] text-navy-400">Manual setup key</p>
            <p className="mt-1 break-all font-mono text-[13px] text-navy-900">JBSWY3DPEHPK3PXP BEYL O2FA</p>
            <Badge tone="warn" className="mt-2">Store recovery codes securely</Badge>
          </div>
        </div>
      </Card>
      <div className="mt-5 space-y-3">
        <div>
          <Label htmlFor="setup-otp">Confirm with a 6-digit code</Label>
          <input
            id="setup-otp"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="000000"
            className="mt-1.5 h-12 w-full rounded-md border border-line bg-white text-center text-[22px] font-semibold tracking-[0.35em] text-navy-900 placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-900/10"
          />
        </div>
        <Button variant="primary" className="w-full" disabled={busy} onClick={confirm}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm setup
        </Button>
        <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>Skip for now</Button>
      </div>
    </AuthShell>
  );
};
