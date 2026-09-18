import { DEMO_MERCHANT_ID, DEMO_MERCHANT_NAME } from './ledger';
import type { TeamRole } from './types';

/** Public sandbox credentials shown on the sign-in screen. */
export const DEMO_ACCOUNT = {
  email: 'demo@beylo.co.uk',
  password: 'DemoBeylo2026!',
  firstName: 'James',
  lastName: 'Wilson',
  jobTitle: 'Managing Director',
  phone: '+44 20 7946 0812',
  merchantName: DEMO_MERCHANT_NAME,
} as const;

export const DEMO_LOCAL_USER_ID = 'beylo-demo-local';
export const DEMO_SESSION_KEY = 'beylo.demo.session';

export const isDemoEmail = (email: string | null | undefined): boolean =>
  Boolean(email && email.trim().toLowerCase() === DEMO_ACCOUNT.email);

export interface DemoProfileShape {
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

export const buildDemoProfile = (overrides: Partial<DemoProfileShape> = {}): DemoProfileShape => ({
  id: overrides.id ?? 'demo-member',
  user_id: overrides.user_id ?? DEMO_LOCAL_USER_ID,
  email: DEMO_ACCOUNT.email,
  first_name: DEMO_ACCOUNT.firstName,
  last_name: DEMO_ACCOUNT.lastName,
  job_title: DEMO_ACCOUNT.jobTitle,
  phone: DEMO_ACCOUNT.phone,
  role: 'Owner',
  status: 'Active',
  merchant_id: DEMO_MERCHANT_ID,
  merchant_name: DEMO_MERCHANT_NAME,
  is_platform_admin: true,
  two_factor_enabled: false,
  last_active: new Date().toISOString(),
  created_at: overrides.created_at ?? new Date().toISOString(),
  ...overrides,
});

export const readLocalDemoSession = (): boolean => {
  try {
    return window.sessionStorage.getItem(DEMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

export const writeLocalDemoSession = (on: boolean) => {
  try {
    if (on) window.sessionStorage.setItem(DEMO_SESSION_KEY, '1');
    else window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
};

/** Fields always enforced for the shared demo login. */
export const demoMemberPatch = () => ({
  role: 'Owner' as const,
  status: 'Active' as const,
  is_platform_admin: true,
  two_factor_enabled: false,
  merchant_id: DEMO_MERCHANT_ID,
  merchant_name: DEMO_MERCHANT_NAME,
  first_name: DEMO_ACCOUNT.firstName,
  last_name: DEMO_ACCOUNT.lastName,
  job_title: DEMO_ACCOUNT.jobTitle,
  phone: DEMO_ACCOUNT.phone,
  email: DEMO_ACCOUNT.email,
});
