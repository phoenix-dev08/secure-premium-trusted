import React from 'react';
import { PAYMENTS, AUDIT_LOGS, WEBHOOK_EVENTS } from '@/data/beylo';
import { AuditLog, Payment, PaymentStatus, SettlementStatus, TimelineEvent, WebhookEvent } from './types';

export const DEMO_MERCHANT_ID = 'MER-10428';
export const DEMO_MERCHANT_NAME = 'Prestige Automotive London';
export const LEDGER_EVENT = 'beylo-ledger';

const STORAGE_KEY = 'beylo.ledger.v1';

export interface LedgerSnapshot {
  payments: Payment[];
  webhooks: WebhookEvent[];
  audit: AuditLog[];
}

const emptyLedger = (): LedgerSnapshot => ({ payments: [], webhooks: [], audit: [] });

const readLedger = (): LedgerSnapshot => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLedger();
    const parsed = JSON.parse(raw) as Partial<LedgerSnapshot>;
    return {
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      webhooks: Array.isArray(parsed.webhooks) ? parsed.webhooks : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
    };
  } catch {
    return emptyLedger();
  }
};

const writeLedger = (next: LedgerSnapshot) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(LEDGER_EVENT));
};

export const buildMerchantId = (): string => `MER-${String(Math.floor(10000 + Math.random() * 90000))}`;

export const newTimeline = (createdBy: string, createdAt: string): TimelineEvent[] => [
  { label: 'Payment Created', timestamp: createdAt, detail: `Created by ${createdBy}` },
  { label: 'Quote Generated', timestamp: null },
  { label: 'Payment Detected', timestamp: null },
  { label: 'Network Confirmed', timestamp: null },
  { label: 'Payment Confirmed', timestamp: null },
  { label: 'Conversion Initiated', timestamp: null },
  { label: 'Settlement Initiated', timestamp: null },
  { label: 'Settled', timestamp: null },
];

export const stampTimeline = (payment: Payment, label: string, detail?: string): Payment => {
  const timestamp = new Date().toISOString();
  let found = false;
  const timeline = payment.timeline.map((ev) => {
    if (ev.label === label && !found) {
      found = true;
      return { ...ev, timestamp, detail: detail ?? ev.detail };
    }
    return ev;
  });
  if (!found) timeline.push({ label, timestamp, detail });
  return { ...payment, timeline };
};

export const getLivePayment = (paymentId: string): Payment | undefined =>
  readLedger().payments.find((p) => p.paymentId === paymentId);

export const upsertPayment = (payment: Payment): Payment => {
  const ledger = readLedger();
  const index = ledger.payments.findIndex((p) => p.paymentId === payment.paymentId);
  if (index >= 0) ledger.payments[index] = payment;
  else ledger.payments.unshift(payment);
  writeLedger(ledger);
  return payment;
};

export const patchPayment = (paymentId: string, patch: Partial<Payment>, timelineLabel?: string, detail?: string): Payment | undefined => {
  const current = getLivePayment(paymentId);
  if (!current) return undefined;
  let next = { ...current, ...patch };
  if (timelineLabel) next = stampTimeline(next, timelineLabel, detail);
  return upsertPayment(next);
};

export const listLivePayments = (merchantId?: string): Payment[] => {
  const rows = readLedger().payments;
  return merchantId ? rows.filter((p) => p.merchantId === merchantId) : rows;
};

export const mergeMerchantPayments = (merchantId?: string | null): Payment[] => {
  const live = listLivePayments(merchantId ?? undefined);
  // Include seed demo transactions for the shared demo merchant, or for platform-wide views.
  const seed =
    !merchantId || merchantId === DEMO_MERCHANT_ID
      ? PAYMENTS.filter((p) => !merchantId || p.merchantId === merchantId)
      : [];
  const byId = new Map<string, Payment>();
  seed.forEach((p) => byId.set(p.paymentId, p));
  live.forEach((p) => byId.set(p.paymentId, p));
  return Array.from(byId.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const findPayment = (paymentId: string): Payment | undefined =>
  getLivePayment(paymentId) ?? PAYMENTS.find((p) => p.paymentId === paymentId);

export const isPaymentExpired = (payment: Payment, now = Date.now()): boolean => {
  if (['completed', 'confirmed', 'failed', 'cancelled', 'expired'].includes(payment.status)) return payment.status === 'expired';
  const expiresAt = payment.expiresAt
    ? Date.parse(payment.expiresAt)
    : Date.parse(payment.createdAt) + payment.expiryMinutes * 60_000;
  return Number.isFinite(expiresAt) && now >= expiresAt;
};

export const expireIfNeeded = (payment: Payment): Payment => {
  if (!isPaymentExpired(payment) || payment.status === 'expired') return payment;
  const expired: Payment = stampTimeline(
    { ...payment, status: 'expired', settlementStatus: 'not_started' },
    payment.quote ? 'Quote Expired' : 'Payment Expired',
    'No funds received before the session expired',
  );
  if (getLivePayment(payment.paymentId)) upsertPayment(expired);
  return expired;
};

export const appendWebhook = (event: Omit<WebhookEvent, 'id' | 'receivedAt'> & { id?: string; receivedAt?: string }) => {
  const ledger = readLedger();
  const row: WebhookEvent = {
    id: event.id ?? `evt_${Math.random().toString(16).slice(2, 10)}`,
    receivedAt: event.receivedAt ?? new Date().toISOString(),
    provider: event.provider,
    type: event.type,
    paymentId: event.paymentId,
    status: event.status,
    signatureVerified: event.signatureVerified,
    attempts: event.attempts,
    payload: event.payload,
  };
  ledger.webhooks.unshift(row);
  writeLedger(ledger);
  return row;
};

export const appendAudit = (entry: Omit<AuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => {
  const ledger = readLedger();
  const row: AuditLog = {
    id: entry.id ?? `log_${Math.random().toString(16).slice(2, 8)}`,
    timestamp: entry.timestamp ?? new Date().toISOString(),
    actor: entry.actor,
    actorRole: entry.actorRole,
    action: entry.action,
    resource: entry.resource,
    ip: entry.ip,
    result: entry.result,
  };
  ledger.audit.unshift(row);
  writeLedger(ledger);
  return row;
};

export const mergeWebhooks = (): WebhookEvent[] => {
  const live = readLedger().webhooks;
  const byId = new Map<string, WebhookEvent>();
  WEBHOOK_EVENTS.forEach((e) => byId.set(e.id, e));
  live.forEach((e) => byId.set(e.id, e));
  return Array.from(byId.values()).sort((a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt));
};

export const mergeAudit = (resource?: string): AuditLog[] => {
  const live = readLedger().audit;
  const byId = new Map<string, AuditLog>();
  AUDIT_LOGS.forEach((e) => byId.set(e.id, e));
  live.forEach((e) => byId.set(e.id, e));
  const rows = Array.from(byId.values()).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  return resource ? rows.filter((r) => r.resource === resource) : rows;
};

export const recordStatusChange = (
  payment: Payment,
  status: PaymentStatus,
  settlementStatus: SettlementStatus,
  timelineLabel: string,
  webhookType: string,
  detail?: string,
): Payment => {
  const next = stampTimeline({ ...payment, status, settlementStatus }, timelineLabel, detail);
  upsertPayment(next);
  appendWebhook({
    provider: 'BEYLO Sandbox Provider',
    type: webhookType,
    paymentId: next.paymentId,
    status: 'Processed',
    signatureVerified: true,
    attempts: 1,
    payload: { event: webhookType, paymentId: next.paymentId, status, settlementStatus, detail },
  });
  return next;
};

export const useLedgerTick = (): number => {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener(LEDGER_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(LEDGER_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return tick;
};

export const useMerchantPayments = (merchantId?: string | null): Payment[] => {
  const tick = useLedgerTick();
  return React.useMemo(() => mergeMerchantPayments(merchantId), [merchantId, tick]);
};

export const usePaymentRecord = (paymentId?: string): Payment | undefined => {
  const tick = useLedgerTick();
  return React.useMemo(() => {
    if (!paymentId) return undefined;
    const found = findPayment(paymentId);
    return found ? expireIfNeeded(found) : undefined;
  }, [paymentId, tick]);
};

export const savePayment = upsertPayment;
export const getPayment = findPayment;

export const listAllPayments = (merchantId?: string | null): Payment[] => {
  if (merchantId) return mergeMerchantPayments(merchantId);
  const live = listLivePayments();
  const byId = new Map<string, Payment>();
  PAYMENTS.forEach((p) => byId.set(p.paymentId, p));
  live.forEach((p) => byId.set(p.paymentId, p));
  return Array.from(byId.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

export const updatePayment = (
  paymentId: string,
  patch: Partial<Payment>,
  event?: TimelineEvent,
): Payment | undefined => {
  const current = findPayment(paymentId);
  if (!current) return undefined;
  const next: Payment = { ...current, ...patch };
  if (event) {
    let found = false;
    next.timeline = next.timeline.map((ev) => {
      if (ev.label === event.label && !found) {
        found = true;
        return { ...ev, ...event };
      }
      return ev;
    });
    if (!found) next.timeline = [...next.timeline, event];
  }
  return upsertPayment(next);
};

const STATUS_TIMELINE: Partial<Record<PaymentStatus, string>> = {
  awaiting_payment: 'Payment Created',
  payment_detected: 'Payment Detected',
  confirming: 'Network Confirmed',
  confirmed: 'Payment Confirmed',
  completed: 'Conversion Initiated',
  expired: 'Quote Expired',
  failed: 'Payment Failed',
  cancelled: 'Payment Cancelled',
};

export const setPaymentStatus = (
  paymentId: string,
  status: PaymentStatus,
  extra: Partial<Payment> = {},
  detail?: string,
): Payment | undefined => {
  const settlementFallback: SettlementStatus | undefined =
    extra.settlementStatus ??
    (status === 'completed'
      ? 'conversion_processing'
      : status === 'confirmed'
        ? 'settlement_pending'
        : status === 'expired' || status === 'failed' || status === 'cancelled'
          ? 'not_started'
          : undefined);
  const next = updatePayment(
    paymentId,
    { status, ...(settlementFallback ? { settlementStatus: settlementFallback } : {}), ...extra },
    {
      label: STATUS_TIMELINE[status] ?? 'Status Updated',
      timestamp: new Date().toISOString(),
      detail,
    },
  );
  if (next) {
    const type =
      status === 'payment_detected'
        ? 'payment.detected'
        : status === 'confirmed'
          ? 'payment.confirmed'
          : status === 'completed'
            ? 'payment.completed'
            : status === 'expired'
              ? 'quote.expired'
              : status === 'failed'
                ? 'payment.failed'
                : status === 'cancelled'
                  ? 'payment.cancelled'
                  : `payment.${status}`;
    appendWebhook({
      provider: 'BEYLO Sandbox Provider',
      type,
      paymentId,
      status: 'Processed',
      signatureVerified: true,
      attempts: 1,
      payload: { event: type, paymentId, status, detail },
    });
  }
  return next;
};

export const merchantDisplayNameFromEmail = (email: string, fallback = 'BEYLO Merchant'): string => {
  const domain = email.split('@')[1]?.split('.')[0];
  if (!domain || ['gmail', 'outlook', 'hotmail', 'yahoo'].includes(domain)) return fallback;
  return domain
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
};
