// Mock XMR exchange rate (USD per XMR)
export const XMR_USD_RATE = 167.42;

export const generateSubaddress = () => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '8';
  for (let i = 0; i < 94; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  return addr;
};

export interface Invoice {
  id: string;
  fiatAmount: number;
  fiatCurrency: string;
  xmrAmount: number;
  subaddress: string;
  status: 'pending' | 'paid' | 'expired';
  createdAt: string;
  paidAt?: string;
  description: string;
  expiresAt: string;
  subscriptionId?: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  primarySubaddress: string;
  settlementAddress: string;
  webhookUrl: string;
  custodyMode: 'managed' | 'self-sovereign';
  plan: 'free' | 'pro';
  apiKey: string;
  createdAt: string;
  autoSweepEnabled: boolean;
  autoSweepThreshold: number;
  coldWalletAddress: string;
  fiatHedgePercent: number;
  privacyModeEnabled: boolean;
  privacyPassphrase: string;
  privacyBackupEmail: string;
  referralCode: string;
  referralsEnabled: boolean;
}

export interface Referral {
  id: string;
  username: string;
  level: number;
  joinedAt: string;
  monthlyCommission: number;
}

export interface ReferralPayout {
  id: string;
  date: string;
  xmrAmount: number;
  referralCount: number;
  status: 'paid' | 'pending';
}

export interface Subscription {
  id: string;
  customerEmail: string;
  description: string;
  fiatAmount: number;
  fiatCurrency: string;
  interval: 'weekly' | 'monthly';
  status: 'active' | 'paused' | 'cancelled';
  nextBillingDate: string;
  createdAt: string;
  invoiceCount: number;
}

export interface PaymentLink {
  id: string;
  slug: string;
  fiatAmount: number;
  fiatCurrency: string;
  label: string;
  createdAt: string;
  uses: number;
}

export const mockMerchant: Merchant = {
  id: 'merch_01',
  name: 'Demo Store',
  email: 'demo@moneroflow.com',
  primarySubaddress: generateSubaddress(),
  settlementAddress: '',
  webhookUrl: 'https://mystore.com/webhooks/xmr',
  custodyMode: 'managed',
  plan: 'free',
  apiKey: 'mf_live_k8x92mzp4q7r1t5y',
  createdAt: '2024-11-15T10:00:00Z',
  autoSweepEnabled: false,
  autoSweepThreshold: 0.5,
  coldWalletAddress: '',
  fiatHedgePercent: 0,
  privacyModeEnabled: false,
  privacyPassphrase: '',
  privacyBackupEmail: '',
  referralCode: 'demo01',
  referralsEnabled: true,
};

const now = new Date();

export const mockReferrals: Referral[] = [
  { id: 'ref_001', username: 'alice_store', level: 1, joinedAt: new Date(now.getTime() - 86400000 * 30).toISOString(), monthlyCommission: 7.25 },
  { id: 'ref_002', username: 'bob_coffee', level: 1, joinedAt: new Date(now.getTime() - 86400000 * 20).toISOString(), monthlyCommission: 29.00 },
  { id: 'ref_003', username: 'carols_craft', level: 2, joinedAt: new Date(now.getTime() - 86400000 * 15).toISOString(), monthlyCommission: 2.90 },
  { id: 'ref_004', username: 'dave_digital', level: 3, joinedAt: new Date(now.getTime() - 86400000 * 5).toISOString(), monthlyCommission: 1.45 },
];

export const mockReferralPayouts: ReferralPayout[] = [
  { id: 'rp_001', date: new Date(now.getTime() - 86400000 * 30).toISOString(), xmrAmount: 0.182, referralCount: 2, status: 'paid' },
  { id: 'rp_002', date: new Date(now.getTime() - 86400000 * 1).toISOString(), xmrAmount: 0.243, referralCount: 4, status: 'pending' },
];
export const mockInvoices: Invoice[] = [
  {
    id: 'inv_a1b2c3',
    fiatAmount: 49.99,
    fiatCurrency: 'USD',
    xmrAmount: 49.99 / XMR_USD_RATE,
    subaddress: generateSubaddress(),
    status: 'paid',
    createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
    paidAt: new Date(now.getTime() - 86400000 * 2 + 300000).toISOString(),
    description: 'Pro Subscription',
    expiresAt: new Date(now.getTime() - 86400000 * 2 + 3600000).toISOString(),
  },
  {
    id: 'inv_d4e5f6',
    fiatAmount: 120.00,
    fiatCurrency: 'USD',
    xmrAmount: 120.00 / XMR_USD_RATE,
    subaddress: generateSubaddress(),
    status: 'paid',
    createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
    paidAt: new Date(now.getTime() - 86400000 * 5 + 600000).toISOString(),
    description: 'Widget Bundle',
    expiresAt: new Date(now.getTime() - 86400000 * 5 + 3600000).toISOString(),
  },
  {
    id: 'inv_g7h8i9',
    fiatAmount: 25.00,
    fiatCurrency: 'USD',
    xmrAmount: 25.00 / XMR_USD_RATE,
    subaddress: generateSubaddress(),
    status: 'pending',
    createdAt: new Date(now.getTime() - 600000).toISOString(),
    description: 'API Access',
    expiresAt: new Date(now.getTime() + 3000000).toISOString(),
  },
  {
    id: 'inv_j0k1l2',
    fiatAmount: 75.50,
    fiatCurrency: 'USD',
    xmrAmount: 75.50 / XMR_USD_RATE,
    subaddress: generateSubaddress(),
    status: 'expired',
    createdAt: new Date(now.getTime() - 86400000 * 7).toISOString(),
    description: 'Design Template',
    expiresAt: new Date(now.getTime() - 86400000 * 7 + 3600000).toISOString(),
  },
];

export const mockSubscriptions: Subscription[] = [
  {
    id: 'sub_001',
    customerEmail: 'alice@example.com',
    description: 'Pro Plan Monthly',
    fiatAmount: 29.00,
    fiatCurrency: 'USD',
    interval: 'monthly',
    status: 'active',
    nextBillingDate: new Date(now.getTime() + 86400000 * 12).toISOString(),
    createdAt: new Date(now.getTime() - 86400000 * 18).toISOString(),
    invoiceCount: 3,
  },
  {
    id: 'sub_002',
    customerEmail: 'bob@widgets.io',
    description: 'API Access Weekly',
    fiatAmount: 9.99,
    fiatCurrency: 'USD',
    interval: 'weekly',
    status: 'active',
    nextBillingDate: new Date(now.getTime() + 86400000 * 3).toISOString(),
    createdAt: new Date(now.getTime() - 86400000 * 30).toISOString(),
    invoiceCount: 8,
  },
  {
    id: 'sub_003',
    customerEmail: 'carol@ngo.org',
    description: 'Monthly Donation',
    fiatAmount: 15.00,
    fiatCurrency: 'USD',
    interval: 'monthly',
    status: 'paused',
    nextBillingDate: new Date(now.getTime() + 86400000 * 20).toISOString(),
    createdAt: new Date(now.getTime() - 86400000 * 60).toISOString(),
    invoiceCount: 5,
  },
];

export const mockPaymentLinks: PaymentLink[] = [
  { id: 'pl_001', slug: 'coffee', fiatAmount: 4.99, fiatCurrency: 'USD', label: 'Buy Me a Coffee', createdAt: new Date(now.getTime() - 86400000 * 10).toISOString(), uses: 12 },
  { id: 'pl_002', slug: 'pro-plan', fiatAmount: 29.00, fiatCurrency: 'USD', label: 'Pro Subscription', createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(), uses: 4 },
];

export const mockRevenueData = [
  { month: 'Nov', revenue: 245.50, txCount: 4, xmrPrice: 158.20 },
  { month: 'Dec', revenue: 892.30, txCount: 12, xmrPrice: 162.40 },
  { month: 'Jan', revenue: 1243.80, txCount: 18, xmrPrice: 171.80 },
  { month: 'Feb', revenue: 567.20, txCount: 8, xmrPrice: 155.30 },
  { month: 'Mar', revenue: 1890.00, txCount: 24, xmrPrice: 169.50 },
  { month: 'Apr', revenue: 320.49, txCount: 5, xmrPrice: 167.42 },
];

export const mockPriceHistory = [
  { time: '00:00', price: 165.80 },
  { time: '04:00', price: 164.20 },
  { time: '08:00', price: 166.50 },
  { time: '12:00', price: 168.10 },
  { time: '16:00', price: 167.00 },
  { time: '20:00', price: 167.42 },
  { time: 'Now', price: 167.42 },
];

export const formatXMR = (amount: number) => amount.toFixed(6) + ' XMR';
export const formatUSD = (amount: number) => '$' + amount.toFixed(2);
export const usdToXmr = (usd: number) => usd / XMR_USD_RATE;
