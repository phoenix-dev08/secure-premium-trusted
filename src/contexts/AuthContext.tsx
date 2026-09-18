import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ROLE_PERMISSIONS, TeamRole } from '@/lib/beylo/types';
import { appendAudit, buildMerchantId, DEMO_MERCHANT_ID, DEMO_MERCHANT_NAME } from '@/lib/beylo/ledger';
import {
  DEMO_ACCOUNT,
  DEMO_LOCAL_USER_ID,
  buildDemoProfile,
  demoMemberPatch,
  isDemoEmail,
  readLocalDemoSession,
  writeLocalDemoSession,
} from '@/lib/beylo/demo';

export interface MemberProfile {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  phone: string | null;
  role: TeamRole;
  status: 'Active' | 'Invited' | 'Disabled';
  merchant_id: string;
  merchant_name: string;
  is_platform_admin: boolean;
  two_factor_enabled: boolean;
  last_active: string | null;
  created_at: string;
}

interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phone?: string;
}

interface AuthState {
  loading: boolean;
  userId: string | null;
  email: string | null;
  profile: MemberProfile | null;
  profileError: string | null;
  displayName: string;
  initials: string;
  role: TeamRole | null;
  isPlatformAdmin: boolean;
  needsTwoFactor: boolean;
  passwordRecovery: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<{ error?: string; needsTwoFactor?: boolean }>;
  enterDemo: () => Promise<{ error?: string }>;
  signUp: (input: SignUpInput & { merchantName?: string }) => Promise<{ error?: string; needsVerification?: boolean; needsEmailVerification?: boolean }>;
  isDemoAccount: boolean;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  updateMember: (patch: Partial<Pick<MemberProfile, 'two_factor_enabled' | 'merchant_name' | 'first_name' | 'last_name' | 'job_title' | 'phone'>>) => Promise<{ error?: string }>;
  markTwoFactorVerified: () => void;
  completeTwoFactor: () => void;
  resendVerificationEmail: () => Promise<{ error?: string }>;
  clearPasswordRecovery: () => void;
  can: (permission: string) => boolean;
}

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export const useAuth = (): AuthState => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const PLATFORM_DOMAIN = '@beylo.co.uk';
const ONBOARDING_KEY = 'beylo.onboarding';

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const readOnboardingDraft = (): Record<string, string> | null => {
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_KEY) || window.localStorage.getItem('beylo.onboarding.draft');
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
};

export const saveOnboardingDraft = (draft: Record<string, string>) => {
  try {
    window.sessionStorage.setItem(ONBOARDING_KEY, JSON.stringify(draft));
    window.localStorage.setItem('beylo.onboarding.draft', JSON.stringify(draft));
  } catch {
    /* storage unavailable */
  }
};

export const clearOnboardingDraft = () => {
  try {
    window.sessionStorage.removeItem(ONBOARDING_KEY);
    window.localStorage.removeItem('beylo.onboarding.draft');
  } catch {
    /* storage unavailable */
  }
};

const twoFaKey = (uid: string) => `beylo.2fa.${uid}`;

export const readTwoFaVerified = (uid: string | null): boolean => {
  if (!uid) return false;
  try {
    return window.sessionStorage.getItem(twoFaKey(uid)) === '1';
  } catch {
    return false;
  }
};

const writeTwoFaVerified = (uid: string, on: boolean) => {
  try {
    if (on) window.sessionStorage.setItem(twoFaKey(uid), '1');
    else window.sessionStorage.removeItem(twoFaKey(uid));
  } catch {
    /* storage unavailable */
  }
};

const readOnboardingName = (): string | null => {
  const draft = readOnboardingDraft();
  return (draft?.tradingName || draft?.legalName || '').trim() || null;
};

const asProfile = (row: unknown): MemberProfile => row as MemberProfile;

const firstNameFrom = (email: string, meta?: Record<string, unknown>) =>
  (meta?.first_name as string) || email.split('@')[0]?.split('.')[0] || 'Member';

const loads = new Map<string, Promise<MemberProfile | null>>();

async function elevateDemoMember(uid: string, row: MemberProfile): Promise<MemberProfile> {
  const patch = { ...demoMemberPatch(), user_id: uid, last_active: new Date().toISOString() };
  const { data } = await supabase.from('merchant_members').update(patch).eq('id', row.id).select('*').maybeSingle();
  return data ? asProfile(data) : { ...row, ...patch, id: row.id };
}

async function resolveProfile(uid: string, userEmail: string, meta?: Record<string, unknown>): Promise<MemberProfile | null> {
  const cached = loads.get(uid);
  if (cached) return cached;

  const task = (async () => {
    const email = normalizeEmail(userEmail);
    const now = new Date().toISOString();
    const demo = isDemoEmail(email);

    const linked = await supabase.from('merchant_members').select('*').eq('user_id', uid).maybeSingle();
    if (linked.data) {
      const row = asProfile(linked.data);
      if (demo) return elevateDemoMember(uid, row);
      void supabase.from('merchant_members').update({ last_active: now, email }).eq('id', row.id);
      return row;
    }

    const invited = await supabase
      .from('merchant_members')
      .select('*')
      .is('user_id', null)
      .ilike('email', email)
      .neq('status', 'Disabled')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (invited.data) {
      const row = asProfile(invited.data);
      const claimed = await supabase
        .from('merchant_members')
        .update({
          user_id: uid,
          status: 'Active',
          email,
          first_name: (meta?.first_name as string) || row.first_name,
          last_name: (meta?.last_name as string) || row.last_name,
          job_title: (meta?.job_title as string) || row.job_title,
          phone: (meta?.phone as string) || row.phone,
          last_active: now,
          ...(demo ? demoMemberPatch() : {}),
        })
        .eq('id', row.id)
        .select('*')
        .maybeSingle();
      if (claimed.data) return asProfile(claimed.data);
    }

    const isAdmin = email.endsWith(PLATFORM_DOMAIN) || demo;
    const draft = readOnboardingDraft();
    const created = await supabase
      .from('merchant_members')
      .insert({
        user_id: uid,
        email,
        first_name: demo ? DEMO_ACCOUNT.firstName : firstNameFrom(email, meta),
        last_name: demo ? DEMO_ACCOUNT.lastName : (meta?.last_name as string) || '',
        job_title: demo ? DEMO_ACCOUNT.jobTitle : (meta?.job_title as string) || null,
        phone: demo ? DEMO_ACCOUNT.phone : (meta?.phone as string) || null,
        role: 'Owner',
        status: 'Active',
        is_platform_admin: isAdmin,
        two_factor_enabled: false,
        merchant_id: isAdmin || demo ? DEMO_MERCHANT_ID : (draft?.merchantId || buildMerchantId()),
        merchant_name: isAdmin || demo
          ? DEMO_MERCHANT_NAME
          : (meta?.merchant_name as string) || readOnboardingName() || `${firstNameFrom(email, meta)}'s business`,
        last_active: now,
      })
      .select('*')
      .maybeSingle();

    if (created.data) return asProfile(created.data);

    const byEmail = await supabase.from('merchant_members').select('*').ilike('email', email).limit(1).maybeSingle();
    if (byEmail.data) {
      const row = asProfile(byEmail.data);
      if (!row.user_id || row.user_id === uid) {
        const claimed = await supabase
          .from('merchant_members')
          .update({
            user_id: uid,
            status: row.status === 'Disabled' ? row.status : 'Active',
            last_active: now,
            email,
            ...(demo ? demoMemberPatch() : {}),
          })
          .eq('id', row.id)
          .select('*')
          .maybeSingle();
        if (claimed.data) return asProfile(claimed.data);
      }
    }

    // Local-capable fallback when the members table is unavailable for the demo login.
    if (demo) return buildDemoProfile({ user_id: uid, id: `demo-${uid.slice(0, 8)}` }) as MemberProfile;

    if (created.error) throw new Error(created.error.message);
    return null;
  })();

  loads.set(uid, task);
  try {
    return await task;
  } catch (err) {
    loads.delete(uid);
    throw err;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<MemberProfile | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [twoFaTick, setTwoFaTick] = React.useState(0);
  const [passwordRecovery, setPasswordRecovery] = React.useState(false);

  const applySession = React.useCallback(
    async (session: { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      const user = session?.user;
      if (!user?.id) {
        setUserId(null);
        setEmail(null);
        setProfile(null);
        setProfileError(null);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ? normalizeEmail(user.email) : null);
      try {
        const next = await resolveProfile(user.id, user.email ?? '', user.user_metadata);
        setProfile(next);
        setProfileError(next ? null : 'Your merchant profile could not be created. Please try signing in again.');
      } catch (err) {
        setProfile(null);
        setProfileError(err instanceof Error ? err.message : 'Unable to load your merchant account');
      }
    },
    [],
  );

  React.useEffect(() => {
    let active = true;

    const start = async () => {
      if (readLocalDemoSession()) {
        if (!active) return;
        setUserId(DEMO_LOCAL_USER_ID);
        setEmail(DEMO_ACCOUNT.email);
        setProfile(buildDemoProfile() as MemberProfile);
        setProfileError(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      await applySession(data.session as never);
      if (active) setLoading(false);
    };
    void start();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (readLocalDemoSession()) return;
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
      }
      void applySession(session as never);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [applySession]);

  const signIn: AuthState['signIn'] = async (emailInput, password, remember) => {
    const normalised = normalizeEmail(emailInput);
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalised, password });
    if (error) {
      appendAudit({
        actor: normalised,
        actorRole: '—',
        action: 'LOGIN_FAILED',
        resource: normalised,
        ip: 'browser',
        result: 'Failure',
      });
      return { error: error.message };
    }
    writeLocalDemoSession(false);
    loads.delete(data.user?.id ?? '');
    await applySession(data.session as never);
    try {
      window.localStorage.setItem('beylo.remember', remember ? normalised : '');
    } catch {
      /* storage unavailable */
    }
    const member = data.user?.id ? await resolveProfile(data.user.id, normalised, data.user.user_metadata) : null;
    appendAudit({
      actor: member ? `${member.first_name} ${member.last_name}`.trim() || normalised : normalised,
      actorRole: member?.role ?? 'Member',
      action: 'LOGIN_SUCCESS',
      resource: member?.merchant_id ?? normalised,
      ip: 'browser',
      result: 'Success',
    });
    // Demo account never requires 2FA in the sandbox.
    if (isDemoEmail(normalised) && data.user?.id) {
      writeTwoFaVerified(data.user.id, true);
      setTwoFaTick((n) => n + 1);
      return {};
    }
    const needsTwoFactor = Boolean(member?.two_factor_enabled && data.user?.id && !readTwoFaVerified(data.user.id));
    return { needsTwoFactor };
  };

  const activateLocalDemo = () => {
    writeLocalDemoSession(true);
    setUserId(DEMO_LOCAL_USER_ID);
    setEmail(DEMO_ACCOUNT.email);
    setProfile(buildDemoProfile() as MemberProfile);
    setProfileError(null);
    setPasswordRecovery(false);
    writeTwoFaVerified(DEMO_LOCAL_USER_ID, true);
    setTwoFaTick((n) => n + 1);
    appendAudit({
      actor: `${DEMO_ACCOUNT.firstName} ${DEMO_ACCOUNT.lastName}`,
      actorRole: 'Owner',
      action: 'LOGIN_SUCCESS',
      resource: DEMO_MERCHANT_ID,
      ip: 'browser',
      result: 'Success',
    });
  };

  const enterDemo: AuthState['enterDemo'] = async () => {
    // 1) Prefer a real Supabase session so the demo works with live auth.
    const signedIn = await supabase.auth.signInWithPassword({
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
    });

    if (!signedIn.error && signedIn.data.session) {
      writeLocalDemoSession(false);
      loads.delete(signedIn.data.user?.id ?? '');
      await applySession(signedIn.data.session as never);
      if (signedIn.data.user?.id) writeTwoFaVerified(signedIn.data.user.id, true);
      setTwoFaTick((n) => n + 1);
      try {
        window.localStorage.setItem('beylo.remember', DEMO_ACCOUNT.email);
      } catch {
        /* ignore */
      }
      return {};
    }

    // 2) Create the demo auth user if it does not exist yet.
    const signedUp = await supabase.auth.signUp({
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
      options: {
        data: {
          first_name: DEMO_ACCOUNT.firstName,
          last_name: DEMO_ACCOUNT.lastName,
          job_title: DEMO_ACCOUNT.jobTitle,
          phone: DEMO_ACCOUNT.phone,
          merchant_name: DEMO_ACCOUNT.merchantName,
        },
      },
    });

    if (!signedUp.error && signedUp.data.session) {
      writeLocalDemoSession(false);
      loads.delete(signedUp.data.user?.id ?? '');
      await applySession(signedUp.data.session as never);
      if (signedUp.data.user?.id) writeTwoFaVerified(signedUp.data.user.id, true);
      setTwoFaTick((n) => n + 1);
      return {};
    }

    // 3) Sandbox fallback — full-access local demo session (no email confirmation required).
    activateLocalDemo();
    return {};
  };

  const signUp: AuthState['signUp'] = async ({ email: emailInput, password, firstName, lastName, jobTitle, phone, merchantName }) => {
    const normalised = normalizeEmail(emailInput);
    if (merchantName) {
      try {
        const existing = readOnboardingDraft() || {};
        saveOnboardingDraft({ ...existing, tradingName: merchantName, legalName: merchantName });
      } catch {
        /* ignore */
      }
    }
    const { data, error } = await supabase.auth.signUp({
      email: normalised,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/signin`,
        data: { first_name: firstName.trim(), last_name: lastName.trim(), job_title: jobTitle, phone, merchant_name: merchantName },
      },
    });
    if (error) return { error: error.message };

    // Prefer explicit email verification when the project requires it.
    if (!data.session) {
      return { needsVerification: true, needsEmailVerification: true };
    }
    loads.delete(data.user?.id ?? '');
    await applySession(data.session as never);
    clearOnboardingDraft();
    return {};
  };

  const signOut = async () => {
    if (userId) writeTwoFaVerified(userId, false);
    if (userId) loads.delete(userId);
    writeLocalDemoSession(false);
    if (userId !== DEMO_LOCAL_USER_ID) {
      await supabase.auth.signOut();
    }
    setUserId(null);
    setEmail(null);
    setProfile(null);
    setProfileError(null);
  };

  const requestPasswordReset: AuthState['requestPasswordReset'] = async (emailInput) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(emailInput), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? { error: error.message } : {};
  };

  const updatePassword: AuthState['updatePassword'] = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setPasswordRecovery(false);
    return error ? { error: error.message } : {};
  };

  const refreshProfile = async () => {
    if (userId === DEMO_LOCAL_USER_ID) {
      setProfile(buildDemoProfile({ id: profile?.id }) as MemberProfile);
      return;
    }
    if (userId && email) {
      loads.delete(userId);
      await applySession({ user: { id: userId, email, user_metadata: {} } });
    }
  };

  const updateMember: AuthState['updateMember'] = async (patch) => {
    if (!profile) return { error: 'No merchant profile is loaded' };
    if (userId === DEMO_LOCAL_USER_ID) {
      setProfile({ ...profile, ...patch } as MemberProfile);
      return {};
    }
    const { data, error } = await supabase.from('merchant_members').update(patch).eq('id', profile.id).select('*').maybeSingle();
    if (error) return { error: error.message };
    if (data) setProfile(asProfile(data));
    if (patch.merchant_name && profile.merchant_id) {
      await supabase.from('merchant_members').update({ merchant_name: patch.merchant_name }).eq('merchant_id', profile.merchant_id);
    }
    return {};
  };

  const markTwoFactorVerified = () => {
    if (userId) writeTwoFaVerified(userId, true);
    setTwoFaTick((n) => n + 1);
  };

  const completeTwoFactor = markTwoFactorVerified;

  const resendVerificationEmail = async () => {
    if (!email) return { error: 'No email address on this session' };
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    return error ? { error: error.message } : {};
  };

  const clearPasswordRecovery = () => setPasswordRecovery(false);

  const role = (profile?.role ?? null) as TeamRole | null;
  const displayName = profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email : email ?? '';
  const initials =
    (displayName || 'B')
      .split(/[\s.@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'B';

  const can = (permission: string) => {
    if (profile?.status === 'Disabled') return false;
    if (isDemoEmail(email) || profile?.is_platform_admin) return true;
    if (!role) return false;
    return ROLE_PERMISSIONS[role].includes(permission);
  };

  const needsTwoFactor = Boolean(profile?.two_factor_enabled && userId && !readTwoFaVerified(userId)) && twoFaTick >= 0;
  const isDemoAccount = isDemoEmail(email) || userId === DEMO_LOCAL_USER_ID;

  const value: AuthState = {
    loading,
    userId,
    email,
    profile,
    profileError,
    displayName,
    initials,
    role,
    isPlatformAdmin: Boolean(profile?.is_platform_admin) || isDemoAccount,
    needsTwoFactor: isDemoAccount ? false : needsTwoFactor,
    passwordRecovery,
    isDemoAccount,
    signIn,
    enterDemo,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    refreshProfile,
    updateMember,
    markTwoFactorVerified,
    completeTwoFactor,
    resendVerificationEmail,
    clearPasswordRecovery,
    can,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const AuthSplash: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex min-h-screen items-center justify-center bg-canvas">
    <div className="flex flex-col items-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-navy-300 border-t-navy-900" />
      <p className="text-[13px] text-navy-400">{label}</p>
    </div>
  </div>
);

const AccessMessage: React.FC<{ title: string; body: string; action?: React.ReactNode }> = ({ title, body, action }) => (
  <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
    <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-[0_1px_2px_rgba(13,22,38,0.04)]">
      <p className="text-[17px] font-semibold text-navy-900">{title}</p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-navy-400">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  </div>
);

export const GuestOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, userId, profile, needsTwoFactor, passwordRecovery } = useAuth();
  const location = useLocation();
  if (loading) return <AuthSplash label="Checking your session…" />;
  if (passwordRecovery) return <>{children}</>;
  if (userId && needsTwoFactor) return <Navigate to="/2fa" replace />;
  if (userId && profile) {
    const from = (location.state as { from?: string } | null)?.from;
    const dest = from && from.startsWith('/') && !from.startsWith('/signin') ? from : profile.is_platform_admin ? '/admin' : '/dashboard';
    return <Navigate to={dest} replace />;
  }
  return <>{children}</>;
};

export const RequireAuth: React.FC<{ children: React.ReactNode; allowUnverified2fa?: boolean }> = ({
  children,
  allowUnverified2fa = false,
}) => {
  const { loading, userId, profile, profileError, needsTwoFactor, passwordRecovery, signOut } = useAuth();
  const location = useLocation();
  if (loading) return <AuthSplash label="Verifying your secure session…" />;
  if (!userId) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  if (!profile) {
    if (profileError) {
      return (
        <AccessMessage
          title="Account could not be loaded"
          body={profileError}
          action={
            <button
              type="button"
              className="rounded-md bg-navy-900 px-4 py-2 text-[13px] font-medium text-white"
              onClick={() => void signOut()}
            >
              Sign out and try again
            </button>
          }
        />
      );
    }
    return <AuthSplash label="Preparing your merchant account…" />;
  }
  if (profile.status === 'Disabled') {
    return (
      <AccessMessage
        title="This login has been disabled"
        body="Ask an account owner or BEYLO administrator to restore access."
        action={
          <button type="button" className="rounded-md bg-navy-900 px-4 py-2 text-[13px] font-medium text-white" onClick={() => void signOut()}>
            Sign out
          </button>
        }
      />
    );
  }
  if (needsTwoFactor && !allowUnverified2fa) return <Navigate to="/2fa" state={{ from: location.pathname }} replace />;
  if (passwordRecovery) return <Navigate to="/reset-password" replace />;
  return <>{children}</>;
};

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, userId, profile, needsTwoFactor, passwordRecovery } = useAuth();
  const location = useLocation();
  if (loading) return <AuthSplash label="Checking administrator access…" />;
  if (!userId) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  if (passwordRecovery) return <Navigate to="/reset-password" replace />;
  if (needsTwoFactor) return <Navigate to="/2fa" state={{ from: location.pathname }} replace />;
  if (!profile?.is_platform_admin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export const RequirePermission: React.FC<{ permission: string; children: React.ReactNode; fallback: React.ReactNode }> = ({
  permission,
  children,
  fallback,
}) => {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
};
