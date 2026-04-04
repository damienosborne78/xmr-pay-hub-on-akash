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
};

const now = new Date();
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

export const mockRevenueData = [
  { month: 'Nov', revenue: 245.50, txCount: 4 },
  { month: 'Dec', revenue: 892.30, txCount: 12 },
  { month: 'Jan', revenue: 1243.80, txCount: 18 },
  { month: 'Feb', revenue: 567.20, txCount: 8 },
  { month: 'Mar', revenue: 1890.00, txCount: 24 },
  { month: 'Apr', revenue: 320.49, txCount: 5 },
];

export const formatXMR = (amount: number) => amount.toFixed(6) + ' XMR';
export const formatUSD = (amount: number) => '$' + amount.toFixed(2);
export const usdToXmr = (usd: number) => usd / XMR_USD_RATE;
