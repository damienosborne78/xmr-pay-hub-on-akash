import { create } from 'zustand';
import { Invoice, Merchant, Subscription, PaymentLink, Referral, ReferralPayout, mockInvoices, mockMerchant, mockSubscriptions, mockPaymentLinks, mockReferrals, mockReferralPayouts, generateSubaddress, usdToXmr } from './mock-data';

interface AppState {
  isAuthenticated: boolean;
  merchant: Merchant;
  invoices: Invoice[];
  subscriptions: Subscription[];
  paymentLinks: PaymentLink[];
  referrals: Referral[];
  referralPayouts: ReferralPayout[];
  login: () => void;
  logout: () => void;
  createInvoice: (description: string, fiatAmount: number, subscriptionId?: string) => Invoice;
  simulatePayment: (invoiceId: string) => void;
  updateMerchant: (updates: Partial<Merchant>) => void;
  createSubscription: (sub: Omit<Subscription, 'id' | 'createdAt' | 'invoiceCount' | 'status' | 'nextBillingDate'> & { interval: Subscription['interval'] }) => Subscription;
  toggleSubscription: (id: string) => void;
  cancelSubscription: (id: string) => void;
  createPaymentLink: (slug: string, fiatAmount: number, label: string) => PaymentLink;
  deletePaymentLink: (id: string) => void;
  simulateReferralPayout: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  merchant: mockMerchant,
  invoices: mockInvoices,
  subscriptions: mockSubscriptions,
  paymentLinks: mockPaymentLinks,
  referrals: mockReferrals,
  referralPayouts: mockReferralPayouts,

  login: () => set({ isAuthenticated: true }),
  logout: () => set({ isAuthenticated: false }),

  createInvoice: (description: string, fiatAmount: number, subscriptionId?: string) => {
    const invoice: Invoice = {
      id: 'inv_' + Math.random().toString(36).slice(2, 8),
      fiatAmount,
      fiatCurrency: 'USD',
      xmrAmount: usdToXmr(fiatAmount),
      subaddress: generateSubaddress(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      description,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      subscriptionId,
    };
    set(state => ({ invoices: [invoice, ...state.invoices] }));
    return invoice;
  },

  simulatePayment: (invoiceId: string) => {
    set(state => ({
      invoices: state.invoices.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'paid' as const, paidAt: new Date().toISOString() }
          : inv
      ),
    }));
  },

  updateMerchant: (updates: Partial<Merchant>) => {
    set(state => ({ merchant: { ...state.merchant, ...updates } }));
  },

  createSubscription: (data) => {
    const nextDate = new Date();
    if (data.interval === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else nextDate.setMonth(nextDate.getMonth() + 1);
    const sub: Subscription = {
      id: 'sub_' + Math.random().toString(36).slice(2, 8),
      customerEmail: data.customerEmail,
      description: data.description,
      fiatAmount: data.fiatAmount,
      fiatCurrency: data.fiatCurrency,
      interval: data.interval,
      status: 'active',
      nextBillingDate: nextDate.toISOString(),
      createdAt: new Date().toISOString(),
      invoiceCount: 0,
    };
    set(state => ({ subscriptions: [sub, ...state.subscriptions] }));
    return sub;
  },

  toggleSubscription: (id: string) => {
    set(state => ({
      subscriptions: state.subscriptions.map(s =>
        s.id === id ? { ...s, status: (s.status === 'active' ? 'paused' : 'active') as Subscription['status'] } : s
      ),
    }));
  },

  cancelSubscription: (id: string) => {
    set(state => ({
      subscriptions: state.subscriptions.map(s =>
        s.id === id ? { ...s, status: 'cancelled' as const } : s
      ),
    }));
  },

  createPaymentLink: (slug: string, fiatAmount: number, label: string) => {
    const link: PaymentLink = {
      id: 'pl_' + Math.random().toString(36).slice(2, 8),
      slug,
      fiatAmount,
      fiatCurrency: 'USD',
      label,
      createdAt: new Date().toISOString(),
      uses: 0,
    };
    set(state => ({ paymentLinks: [link, ...state.paymentLinks] }));
    return link;
  },

  deletePaymentLink: (id: string) => {
    set(state => ({ paymentLinks: state.paymentLinks.filter(l => l.id !== id) }));
  },

  simulateReferralPayout: () => {
    const state = get();
    const totalCommission = state.referrals.reduce((s, r) => s + r.monthlyCommission, 0);
    const xmrAmount = usdToXmr(totalCommission);
    const payout: ReferralPayout = {
      id: 'rp_' + Math.random().toString(36).slice(2, 8),
      date: new Date().toISOString(),
      xmrAmount,
      referralCount: state.referrals.length,
      status: 'paid',
    };
    set(state => ({ referralPayouts: [payout, ...state.referralPayouts] }));
  },
}));
