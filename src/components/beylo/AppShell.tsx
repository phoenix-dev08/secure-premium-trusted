import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BeyloLogo, Badge, Button } from './primitives';
import { MERCHANT } from '@/data/beylo';
import { useAuth } from '@/contexts/AuthContext';
import {
  Activity,
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  CreditCard,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PlusCircle,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
  X,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Permission required to see this item — undefined means always visible. */
  permission?: string;
}

export const MERCHANT_NAV: NavItem[] = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Create Payment', to: '/dashboard/create-payment', icon: PlusCircle, permission: 'Create Payments' },
  { label: 'Transactions', to: '/dashboard/transactions', icon: CreditCard, permission: 'View Payments' },
  { label: 'Settlements', to: '/dashboard/settlements', icon: Receipt, permission: 'View Settlements' },
  { label: 'Customers / References', to: '/dashboard/customers', icon: Building2, permission: 'View Payments' },
  { label: 'Team', to: '/dashboard/team', icon: Users },
  { label: 'Reports', to: '/dashboard/reports', icon: FileBarChart, permission: 'Export Reports' },
  { label: 'Settings', to: '/dashboard/settings', icon: Settings },
];

export const MERCHANT_NAV_FOOTER: NavItem[] = [
  { label: 'Help & Support', to: '/dashboard/support', icon: LifeBuoy },
  { label: 'Documentation', to: '/docs', icon: BookOpen },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard },
  { label: 'Merchants', to: '/admin/merchants', icon: Building2 },
  { label: 'Payments', to: '/admin/payments', icon: CreditCard },
  { label: 'Settlements', to: '/admin/settlements', icon: Receipt },
  { label: 'Webhook Events', to: '/admin/webhooks', icon: Webhook },
  { label: 'Audit Logs', to: '/admin/audit', icon: ScrollText },
  { label: 'Provider Health', to: '/admin/provider-health', icon: Activity },
  { label: 'Admin Users', to: '/admin/users', icon: ShieldCheck },
];

const NavLinks: React.FC<{ items: NavItem[]; onNavigate?: () => void }> = ({ items, onNavigate }) => {
  const { pathname } = useLocation();
  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active = pathname === item.to || (item.to !== '/dashboard' && item.to !== '/admin' && pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              'group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors',
              active ? 'bg-white/10 text-white' : 'text-navy-300 hover:bg-white/5 hover:text-white',
            )}
          >
            <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-gold-500' : 'text-navy-400 group-hover:text-navy-300')} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export const AppShell: React.FC<{
  children: React.ReactNode;
  variant?: 'merchant' | 'admin';
  title?: string;
}> = ({ children, variant = 'merchant', title }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const navigate = useNavigate();
  const { profile, displayName, initials, role, isPlatformAdmin, can, signOut } = useAuth();

  // Sidebar is driven by the signed-in member's role permissions.
  const nav = variant === 'admin' ? ADMIN_NAV : MERCHANT_NAV.filter((i) => !i.permission || can(i.permission));
  const merchantName = profile?.merchant_name ?? MERCHANT.tradingName;
  const merchantId = profile?.merchant_id ?? MERCHANT.id;

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
    navigate('/signin', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-900">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <BeyloLogo tone="light" to={variant === 'admin' ? '/admin' : '/dashboard'} subtitle={variant === 'admin' ? 'Administration' : 'Business'} />
        <button className="text-navy-300 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks items={nav} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="border-t border-white/10 px-3 py-4">
        {variant === 'merchant' ? (
          <NavLinks
            items={[
              ...MERCHANT_NAV_FOOTER,
              ...(isPlatformAdmin ? [{ label: 'Admin Portal', to: '/admin', icon: ShieldCheck } as NavItem] : []),
            ]}
            onNavigate={() => setMobileOpen(false)}
          />
        ) : (
          <NavLinks items={[{ label: 'Merchant View', to: '/dashboard', icon: Building2 }]} onNavigate={() => setMobileOpen(false)} />
        )}
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-400">Provider</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-finsuccess" />
            BEYLO Sandbox Provider
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden">{sidebar}</aside>
        </>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur md:px-6">
          <button className="rounded-md p-2 text-navy-700 hover:bg-canvas lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">
              {variant === 'admin' ? 'BEYLO Platform Administration' : merchantName}
            </p>
            <p className="truncate text-[12px] text-navy-400">
              {title ?? (variant === 'admin' ? 'Internal operations console' : `Merchant ID ${merchantId}`)}
            </p>
          </div>

          <Badge tone="success" className="hidden md:inline-flex">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </Badge>

          <div className="relative">
            <button
              className="relative rounded-md p-2 text-navy-700 hover:bg-canvas"
              onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold-500" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg border border-line bg-white p-2 shadow-xl">
                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-400">Notifications</p>
                {[
                  ['Payment confirmed', 'BYL-240918-001 · £124,500.00'],
                  ['Settlement pending', 'STL-20260919-001 · £196,409.00'],
                  ['Quote expired', 'BYL-240916-019 · £18,750.00'],
                ].map(([t, s]) => (
                  <div key={t} className="rounded-md px-2 py-2 hover:bg-canvas">
                    <p className="text-[13px] font-medium text-navy-900">{t}</p>
                    <p className="text-[12px] text-navy-400">{s}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 hover:bg-canvas"
              onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="hidden max-w-[150px] truncate text-[13px] font-medium text-navy-900 sm:block">{displayName}</span>
              <ChevronDown className="h-4 w-4 text-navy-400" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-line bg-white p-1.5 shadow-xl">
                <div className="border-b border-line px-2.5 py-2">
                  <p className="truncate text-[13px] font-semibold text-navy-900">{displayName}</p>
                  <p className="truncate text-[12px] text-navy-400">{profile?.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="gold">{isPlatformAdmin ? 'Platform Administrator' : role ?? 'Member'}</Badge>
                    {profile?.status && profile.status !== 'Active' && <Badge tone="warn">{profile.status}</Badge>}
                  </div>
                </div>
                <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-navy-700 hover:bg-canvas" onClick={() => { setProfileOpen(false); navigate('/dashboard/settings'); }}>
                  <Settings className="h-4 w-4" /> Account profile
                </button>
                <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-navy-700 hover:bg-canvas" onClick={() => { setProfileOpen(false); navigate('/docs'); }}>
                  <FileText className="h-4 w-4" /> Documentation
                </button>
                <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-finerror hover:bg-finerror-soft" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">{children}</main>

        <footer className="mx-auto w-full max-w-[1400px] px-4 pb-8 md:px-6">
          <div className="flex flex-col gap-2 border-t border-line pt-5 text-[12px] text-navy-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 BEYLO Payments Ltd · Registered in England &amp; Wales</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/docs" className="hover:text-navy-700">API Documentation</Link>
              <Link to="/dashboard/support" className="hover:text-navy-700">Support</Link>
              <span>Sandbox environment</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}> = ({ title, description, actions, eyebrow }) => (
  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">{eyebrow}</p>}
      <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-navy-900 md:text-[28px]">{title}</h1>
      {description && <p className="mt-1 text-sm text-navy-400">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const BackLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link to={to} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-400 hover:text-navy-900">
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </svg>
    {label}
  </Link>
);

/** Shown when the signed-in member's role lacks a permission. */
export const PermissionDenied: React.FC<{ permission: string }> = ({ permission }) => {
  const { role } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-line bg-white p-8 text-center shadow-[0_1px_2px_rgba(13,22,38,0.04)]">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-finwarn-soft">
        <ShieldCheck className="h-5 w-5 text-finwarn" />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-navy-900">Permission required</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-navy-400">
        Your role ({role ?? 'Member'}) does not include the <span className="font-medium text-navy-700">{permission}</span>{' '}
        permission. Ask an account owner or administrator to update your access.
      </p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>Back to overview</Button>
    </div>
  );
};

export const ToolbarButton = Button;
