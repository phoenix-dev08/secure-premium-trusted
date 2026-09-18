// BEYLO core domain types — shared single source of truth
// NOTE: All crypto/quote/settlement values conceptually originate from the
// external payment infrastructure provider (see provider.ts adapter layer).

export type PaymentStatus =
  | 'awaiting_payment'
  | 'payment_detected'
  | 'confirming'
  | 'confirmed'
  | 'completed'
  | 'expired'
  | 'failed'
  | 'cancelled';

export type SettlementStatus =
  | 'not_started'
  | 'conversion_processing'
  | 'settlement_pending'
  | 'processing'
  | 'settled'
  | 'failed';

export type MerchantStatus = 'active' | 'pending' | 'restricted' | 'suspended';
export type VerificationStatus = 'pending_review' | 'information_required' | 'verified' | 'rejected';
export type TeamRole = 'Owner' | 'Administrator' | 'Payment Operator' | 'Read Only';

export interface CryptoAsset {
  asset: string;          // USDC
  name: string;           // USD Coin
  network: string;        // ethereum
  networkLabel: string;   // Ethereum
  type: 'stablecoin' | 'crypto';
  confirmationsRequired: number;
  enabled: boolean;
}

export interface Quote {
  quoteId: string;
  fiatCurrency: 'GBP';
  fiatAmount: number;
  asset: string;
  network: string;
  networkLabel: string;
  cryptoAmount: number;
  exchangeRate: number;   // 1 asset = X GBP
  providerFeeGbp: number;
  networkFeeNote: string;
  expiresAt: string;      // ISO
  provider: string;
}

export interface PaymentInstructions {
  address: string;
  asset: string;
  network: string;
  networkLabel: string;
  cryptoAmount: number;
  memo?: string;
  paymentUri: string;
  expiresAt: string;
}

export interface Payment {
  paymentId: string;              // BYL-240918-004
  providerPaymentId: string;      // provider_demo_92838
  providerTransactionId?: string;
  merchantId: string;
  merchantName: string;
  createdAt: string;
  reference: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  gbpAmount: number;
  asset?: string;
  network?: string;
  cryptoAmount?: number;
  exchangeRate?: number;
  status: PaymentStatus;
  settlementStatus: SettlementStatus;
  settlementCurrency: 'GBP';
  settlementId?: string;
  feesGbp?: number;
  netGbp?: number;
  createdBy: string;
  expiryMinutes: number;
  timeline: TimelineEvent[];
  txHash?: string;
}

export interface TimelineEvent {
  label: string;
  timestamp: string | null;
  detail?: string;
}

export interface Settlement {
  settlementId: string;
  merchantId: string;
  merchantName: string;
  date: string;
  transactions: string[];
  grossGbp: number;
  feesGbp: number;
  netGbp: number;
  bankAccount: string;
  status: SettlementStatus;
  expectedDate: string;
  reference: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: 'Active' | 'Invited' | 'Disabled';
  lastActive: string;
}

export interface MerchantRecord {
  id: string;
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  industry: string;
  country: string;
  status: MerchantStatus;
  verification: VerificationStatus;
  onboarding: 'Complete' | 'In Review' | 'Incomplete';
  volumeGbp: number;
  payments: number;
  createdAt: string;
  representative: { name: string; jobTitle: string; email: string; phone: string };
  address: string;
  website: string;
  bankAccount: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  type: string;
  paymentId: string;
  receivedAt: string;
  status: 'Processed' | 'Duplicate Ignored' | 'Pending' | 'Failed';
  signatureVerified: boolean;
  attempts: number;
  payload: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  resource: string;
  ip: string;
  result: 'Success' | 'Failure';
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  awaiting_payment: 'Awaiting Payment',
  payment_detected: 'Payment Detected',
  confirming: 'Confirming',
  confirmed: 'Payment Confirmed',
  completed: 'Completed',
  expired: 'Expired',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  not_started: 'Not Started',
  conversion_processing: 'Conversion Processing',
  settlement_pending: 'Settlement Pending',
  processing: 'Processing',
  settled: 'Settled',
  failed: 'Failed',
};

export const INDUSTRIES = [
  'Automotive',
  'Jewellery',
  'Luxury Watches',
  'Fine Art',
  'Marine / Yachts',
  'Property Services',
  'Premium Retail',
  'Other',
];

export const AMOUNT_BANDS = [
  'Under £10,000',
  '£10,000 – £25,000',
  '£25,000 – £50,000',
  '£50,000 – £100,000',
  '£100,000+',
];

export const PERMISSIONS = [
  'Create Payments',
  'View Payments',
  'View Settlements',
  'Manage Team',
  'Manage Settings',
  'Export Reports',
];

export const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  Owner: PERMISSIONS,
  Administrator: ['Create Payments', 'View Payments', 'View Settlements', 'Manage Team', 'Export Reports'],
  'Payment Operator': ['Create Payments', 'View Payments'],
  'Read Only': ['View Payments', 'View Settlements'],
};
