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

export interface PosQuickButton {
  id: string;
  label: string;
  price: number;
  category: string;
  color: string;
  stock?: number;
  icon?: string;
}

export interface PosModifier {
  id: string;
  name: string;
  options: { label: string; priceAdj: number }[];
}

export interface PosCombo {
  id: string;
  name: string;
  itemIds: string[];
  discount: number;
  price: number;
}

export interface ParkedOrder {
  id: string;
  label: string;
  items: { name: string; price: number; qty: number; modifiers?: string[] }[];
  total: number;
  parkedAt: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  modifiers?: string[];
  modifierTotal?: number;
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
  // Localization
  fiatCurrency: string;
  fiatSymbol: string;
  // View-only wallet fields
  viewOnlyAddress: string;
  viewOnlyViewKey: string;
  viewOnlyRestoreHeight: number;
  viewOnlyNodeUrl: string;
  viewOnlySetupComplete: boolean;
  viewOnlySeedPhrase: string;
  viewOnlySeedBackedUp: boolean;
  viewOnlySubaddressIndex: number;
  viewOnlySpendKey: string;
  viewOnlyPublicSpendKey: string;
  viewOnlyPublicViewKey: string;
  // Node connection state
  connectedNodeLabel: string;
  connectedNodeUrl: string;
  nodeStatus: 'online' | 'syncing' | 'offline' | 'connecting';
  nodeHeight: number;
  nodeLatencyMs: number;
  // PoS Pro features
  posQuickButtons: PosQuickButton[];
  posCategories: string[];
  // Domain
  fqdn: string;
  // PoS Elite features
  posModifiers: PosModifier[];
  posCombos: PosCombo[];
  posFavorites: string[];
  parkedOrders: ParkedOrder[];
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
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
];

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
  walletMode: 'viewonly',
  remoteNodeUrl: '',
  remoteNodeSsl: false,
  nativeRpcEnabled: true,
  rpcEndpoint: 'http://127.0.0.1:18082',
  rpcUsername: '',
  rpcPassword: '',
  rpcWalletFilename: '',
  rpcConnected: false,
  fiatCurrency: 'USD',
  fiatSymbol: '$',
  viewOnlyAddress: '',
  viewOnlyViewKey: '',
  viewOnlyRestoreHeight: 0,
  viewOnlyNodeUrl: '',
  viewOnlySetupComplete: false,
  viewOnlySeedPhrase: '',
  viewOnlySeedBackedUp: false,
  viewOnlySubaddressIndex: 1,
  viewOnlySpendKey: '',
  viewOnlyPublicSpendKey: '',
  viewOnlyPublicViewKey: '',
  connectedNodeLabel: '',
  connectedNodeUrl: '',
  nodeStatus: 'offline',
  nodeHeight: 0,
  nodeLatencyMs: 0,
  posQuickButtons: [],
  posCategories: ['Food', 'Drinks', 'Services', 'Products'],
  fqdn: '',
  posModifiers: [],
  posCombos: [],
  posFavorites: [],
  parkedOrders: [],
};

export const formatXMR = (amount: number) => amount.toFixed(6) + ' XMR';
export const formatUSD = (amount: number) => '$' + amount.toFixed(2);
export const formatFiat = (amount: number, symbol: string = '$', code: string = 'USD') => {
  if (code === 'JPY') return symbol + Math.round(amount).toLocaleString();
  return symbol + amount.toFixed(2);
};
export const usdToXmr = (usd: number) => usd / XMR_USD_RATE;
