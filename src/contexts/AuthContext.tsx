import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ROLE_PERMISSIONS, TeamRole } from '@/lib/beylo/types';

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

interface AuthState {
  loading: boolean;
  userId: string | null;
  email: string | null;
  profile: MemberProfile | null;
  displayName: string;
  initials: string;
  role: TeamRole | null;
  isPlatformAdmin: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<{ error?: string }>;
  signUp: (input: { email: string; password: string; firstName: string; lastName: string; jobTitle?: string; phone?: string }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export const useAuth = (): AuthState => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

const PLATFORM_DOMAIN = '@beylo.co.uk';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<MemberProfile | null>(null);

  const loadProfile = React.useCallback(async (uid: string, userEmail: string, meta?: Record<string, unknown>) => {
    // 1) Try the row already linked to this auth user.
    const linked = await supabase.from('merchant_members').select('*').eq('user_id', uid).maybeSingle();
    if (linked.data) {
      setProfile(linked.data as MemberProfile);
      void supabase.from('merchant_members').update({ last_active: new Date().toISOString() }).eq('user_id', uid);
      return;
    }

    // 2) Claim a pending invitation created by a team administrator.
    const invited = await supabase
      .from('merchant_members')
      .select('*')
      .is('user_id', null)
      .ilike('email', userEmail)
      .maybeSingle();

    if (invited.data) {
      const claimed = await supabase
        .from('merchant_members')
        .update({ user_id: uid, status: 'Active', last_active: new Date().toISOString() })
        .eq('id', (invited.data as MemberProfile).id)
        .select('*')
        .maybeSingle();
      if (claimed.data) {
        setProfile(claimed.data as MemberProfile);
        return;
      }
    }

    // 3) First-time sign-in: provision the member record.
    const isAdmin = userEmail.toLowerCase().endsWith(PLATFORM_DOMAIN);
    const { count } = await supabase.from('merchant_members').select('id', { count: 'exact', head: true });
    const created = await supabase
      .from('merchant_members')
      .insert({
        user_id: uid,
        email: userEmail,
        first_name: (meta?.first_name as string) || userEmail.split('@')[0].split('.')[0] || 'Member',
        last_name: (meta?.last_name as string) || '',
        job_title: (meta?.job_title as string) || null,
        phone: (meta?.phone as string) || null,
        role: isAdmin || !count ? 'Owner' : 'Payment Operator',
        status: 'Active',
        is_platform_admin: isAdmin,
      })
      .select('*')
      .maybeSingle();

    if (created.data) setProfile(created.data as MemberProfile);
  }, []);

  const applySession = React.useCallback(
    async (session: { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      const user = session?.user;
      if (!user?.id) {
        setUserId(null);
        setEmail(null);
        setProfile(null);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? null);
      try {
        await loadProfile(user.id, user.email ?? '', user.user_metadata);
      } catch {
        setProfile(null);
      }
    },
    [loadProfile],
  );

  React.useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        await applySession(data.session as never);
      })
      .finally(() => active && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session as never);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [applySession]);

  const signIn: AuthState['signIn'] = async (emailInput, password, remember) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailInput.trim(), password });
    if (error) return { error: error.message };
    try {
      window.localStorage.setItem('beylo.remember', remember ? emailInput.trim() : '');
    } catch {
      /* storage unavailable */
    }
    await applySession(data.session as never);
    return {};
  };

  const signUp: AuthState['signUp'] = async ({ email: emailInput, password, firstName, lastName, jobTitle, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email: emailInput.trim(),
      password,
      options: { data: { first_name: firstName, last_name: lastName, job_title: jobTitle, phone } },
    });
    if (error) return { error: error.message };

    if (!data.session) {
      const signedIn = await supabase.auth.signInWithPassword({ email: emailInput.trim(), password });
      if (signedIn.error) return { error: signedIn.error.message };
      await applySession(signedIn.data.session as never);
      return {};
    }
    await applySession(data.session as never);
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setEmail(null);
    setProfile(null);
  };

  const requestPasswordReset: AuthState['requestPasswordReset'] = async (emailInput) => {
    const { error } = await supabase.auth.resetPasswordForEmail(emailInput.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? { error: error.message } : {};
  };

  const updatePassword: AuthState['updatePassword'] = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { error: error.message } : {};
  };

  const refreshProfile = async () => {
    if (userId && email) await loadProfile(userId, email);
  };

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
    if (profile?.is_platform_admin) return true;
    if (!role) return false;
    return ROLE_PERMISSIONS[role].includes(permission);
  };

  const value: AuthState = {
    loading,
    userId,
    email,
    profile,
    displayName,
    initials,
    role,
    isPlatformAdmin: Boolean(profile?.is_platform_admin),
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    refreshProfile,
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

/** Redirect guard for every merchant dashboard route. */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, userId } = useAuth();
  const location = useLocation();
  if (loading) return <AuthSplash label="Verifying your secure session…" />;
  if (!userId) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
};

/** Redirect guard for BEYLO platform administration routes. */
export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, userId, profile } = useAuth();
  const location = useLocation();
  if (loading) return <AuthSplash label="Checking administrator access…" />;
  if (!userId) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  if (!profile?.is_platform_admin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

/** Inline permission gate used inside dashboard pages. */
export const RequirePermission: React.FC<{ permission: string; children: React.ReactNode; fallback: React.ReactNode }> = ({
  permission,
  children,
  fallback,
}) => {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
};
