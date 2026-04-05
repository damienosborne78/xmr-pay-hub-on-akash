// XMR exchange rate — in production, fetch from a live API (e.g. CoinGecko)
export const XMR_USD_RATE = 167.42;

export interface Invoice {
  id: string;
  fiatAmount: number;
  fiatCurrency: string;
  xmrAmount: number;
  subaddress: string;
  subaddressIndex?: number;
  status: 'pending' | 'seen_on_chain' | 'confirming' | 'paid' | 'underpaid' | 'overpaid' | 'expired';
  confirmations?: number;
  createdAt: string;
  paidAt?: string;
  description: string;
  expiresAt: string;
  subscriptionId?: string;
  txid?: string;
  txKey?: string;
  customerNote?: string;
  cartId?: string;
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
  walletMode: 'managed' | 'remote' | 'selfcustody' | 'viewonly';
  remoteNodeUrl: string;
  remoteNodeSsl: boolean;
  nativeRpcEnabled: boolean;
  rpcEndpoint: string;
  rpcUsername: string;
  rpcPassword: string;
  rpcWalletFilename: string;
  rpcConnected: boolean;
  // View-only wallet fields
  viewOnlyAddress: string;
  viewOnlyViewKey: string;
  viewOnlyRestoreHeight: number;
  viewOnlyNodeUrl: string;
  viewOnlySetupComplete: boolean;
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

// Default merchant — empty, no mock data
export const defaultMerchant: Merchant = {
  id: '',
  name: '',
  email: '',
  primarySubaddress: '',
  settlementAddress: '',
  webhookUrl: '',
  custodyMode: 'managed',
  plan: 'free',
  apiKey: '',
  createdAt: new Date().toISOString(),
  autoSweepEnabled: false,
  autoSweepThreshold: 0.5,
  coldWalletAddress: '',
  fiatHedgePercent: 0,
  privacyModeEnabled: false,
  privacyPassphrase: '',
  privacyBackupEmail: '',
  referralCode: '',
  referralsEnabled: false,
  walletMode: 'managed',
  remoteNodeUrl: '',
  remoteNodeSsl: false,
  nativeRpcEnabled: true,
  rpcEndpoint: 'http://127.0.0.1:18082',
  rpcUsername: '',
  rpcPassword: '',
  rpcWalletFilename: '',
  rpcConnected: false,
};

export const formatXMR = (amount: number) => amount.toFixed(6) + ' XMR';
export const formatUSD = (amount: number) => '$' + amount.toFixed(2);
export const usdToXmr = (usd: number) => usd / XMR_USD_RATE;
