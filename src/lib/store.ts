import { create } from 'zustand';
import { Invoice, Merchant, Subscription, PaymentLink, Referral, ReferralPayout, defaultMerchant, usdToXmr } from './mock-data';
import { createSubaddress, getTransfers, type RpcConfig } from './monero-rpc';

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
  createInvoice: (description: string, fiatAmount: number, subscriptionId?: string) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  pollInvoicePayment: (invoiceId: string) => Promise<void>;
  updateMerchant: (updates: Partial<Merchant>) => void;
  createSubscription: (sub: Omit<Subscription, 'id' | 'createdAt' | 'invoiceCount' | 'status' | 'nextBillingDate'> & { interval: Subscription['interval'] }) => Subscription;
  toggleSubscription: (id: string) => void;
  cancelSubscription: (id: string) => void;
  createPaymentLink: (slug: string, fiatAmount: number, label: string) => PaymentLink;
  deletePaymentLink: (id: string) => void;
  getRpcConfig: () => RpcConfig;
}

export const useStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  merchant: defaultMerchant,
  invoices: [],
  subscriptions: [],
  paymentLinks: [],
  referrals: [],
  referralPayouts: [],

  login: () => set({ isAuthenticated: true }),
  logout: () => set({ isAuthenticated: false }),

  getRpcConfig: () => {
    const m = get().merchant;
    const endpoint = m.walletMode === 'remote'
      ? `http${m.remoteNodeSsl ? 's' : ''}://${m.remoteNodeUrl}`
      : m.rpcEndpoint;
    return {
      endpoint,
      username: m.rpcUsername,
      password: m.rpcPassword,
      walletFilename: m.rpcWalletFilename,
    };
  },

  createInvoice: async (description: string, fiatAmount: number, subscriptionId?: string) => {
    const config = get().getRpcConfig();
    let subaddress = '';
    let subaddressIndex: number | undefined;

    try {
      // Create a real subaddress via monero-wallet-rpc
      const result = await createSubaddress(config, `Invoice: ${description}`);
      subaddress = result.address;
      subaddressIndex = result.addressIndex;
    } catch (e) {
      console.error('Failed to create subaddress via RPC:', e);
      throw new Error('Could not create subaddress. Check your RPC connection in Settings → Wallet & Node.');
    }

    const invoice: Invoice = {
      id: 'inv_' + Math.random().toString(36).slice(2, 8),
      fiatAmount,
      fiatCurrency: 'USD',
      xmrAmount: usdToXmr(fiatAmount),
      subaddress,
      subaddressIndex,
      status: 'pending',
      confirmations: 0,
      createdAt: new Date().toISOString(),
      description,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      subscriptionId,
    };
    set(state => ({ invoices: [invoice, ...state.invoices] }));
    return invoice;
  },

  updateInvoice: (id: string, updates: Partial<Invoice>) => {
    set(state => ({
      invoices: state.invoices.map(inv =>
        inv.id === id ? { ...inv, ...updates } : inv
      ),
    }));
  },

  pollInvoicePayment: async (invoiceId: string) => {
    const state = get();
    const invoice = state.invoices.find(i => i.id === invoiceId);
    if (!invoice || invoice.status === 'paid' || invoice.status === 'expired') return;
    if (invoice.subaddressIndex === undefined) return;

    // Check expiry
    if (new Date(invoice.expiresAt).getTime() < Date.now()) {
      get().updateInvoice(invoiceId, { status: 'expired' });
      return;
    }

    const config = get().getRpcConfig();

    try {
      const transfers = await getTransfers(config, [invoice.subaddressIndex]);
      const incoming = [...transfers.in, ...transfers.pending].filter(
        t => t.subaddrIndex.minor === invoice.subaddressIndex
      );

      if (incoming.length === 0) return;

      // Sum up received amounts (in piconero)
      const totalReceived = incoming.reduce((sum, t) => sum + t.amount, 0);
      const totalReceivedXmr = totalReceived / 1e12;
      const expectedXmr = invoice.xmrAmount;

      // Get the first matching tx for details
      const primaryTx = incoming[0];
      const confirmations = primaryTx.confirmations || 0;

      let newStatus: Invoice['status'];

      if (totalReceivedXmr >= expectedXmr * 0.99) {
        // Within 1% tolerance
        if (confirmations >= 10) {
          newStatus = 'paid';
        } else if (confirmations >= 1) {
          newStatus = 'confirming';
        } else {
          newStatus = 'seen_on_chain';
        }

        if (totalReceivedXmr > expectedXmr * 1.01) {
          newStatus = confirmations >= 10 ? 'overpaid' : newStatus;
        }
      } else {
        newStatus = 'underpaid';
      }

      get().updateInvoice(invoiceId, {
        status: newStatus,
        confirmations,
        txid: primaryTx.txid,
        paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined,
      });
    } catch (e) {
      console.error('Payment polling error:', e);
    }
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
}));
