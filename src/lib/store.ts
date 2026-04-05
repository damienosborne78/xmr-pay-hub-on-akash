import { create } from 'zustand';
import { Invoice, Merchant, Subscription, PaymentLink, Referral, ReferralPayout, defaultMerchant, usdToXmr } from './mock-data';
import { createSubaddress, getTransfers, type RpcConfig } from './monero-rpc';
import { generateSubaddress } from './wallet-generator';
import { findFastestNode, connectWithFailover, testNode, REMOTE_NODES, type NodeStatus } from './node-manager';

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
  autoConnectNode: () => Promise<NodeStatus | null>;
  refreshNodeStatus: () => Promise<void>;
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
    if (m.walletMode === 'viewonly') {
      const nodeUrl = m.connectedNodeUrl || m.viewOnlyNodeUrl || REMOTE_NODES[0].url;
      const endpoint = `https://${nodeUrl}`;
      return { endpoint, username: '', password: '', walletFilename: '' };
    }
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

  autoConnectNode: async () => {
    const m = get().merchant;
    if (m.walletMode !== 'viewonly' && m.walletMode !== 'remote') return null;

    get().updateMerchant({ nodeStatus: 'connecting' });

    // If we have a currently configured node, try it first
    const currentUrl = m.walletMode === 'viewonly' ? m.viewOnlyNodeUrl : m.remoteNodeUrl;
    if (currentUrl) {
      const currentNode = REMOTE_NODES.find(n => n.url === currentUrl) || { label: 'Custom', url: currentUrl, ssl: true };
      const status = await testNode(currentNode, 6000);
      if (status.connected) {
        get().updateMerchant({
          connectedNodeLabel: status.label,
          connectedNodeUrl: status.url,
          nodeStatus: status.status,
          nodeHeight: status.height,
          nodeLatencyMs: status.latencyMs,
          rpcConnected: true,
        });
        return status;
      }
    }

    // Failover: find fastest available node
    const result = await findFastestNode();
    if (result) {
      const updates: Partial<Merchant> = {
        connectedNodeLabel: result.status.label,
        connectedNodeUrl: result.node.url,
        nodeStatus: result.status.status,
        nodeHeight: result.status.height,
        nodeLatencyMs: result.status.latencyMs,
        rpcConnected: true,
      };
      if (m.walletMode === 'viewonly') updates.viewOnlyNodeUrl = result.node.url;
      if (m.walletMode === 'remote') {
        updates.remoteNodeUrl = result.node.url;
        updates.remoteNodeSsl = result.node.ssl;
      }
      get().updateMerchant(updates);
      return result.status;
    }

    get().updateMerchant({ nodeStatus: 'offline', rpcConnected: false });
    return null;
  },

  refreshNodeStatus: async () => {
    const m = get().merchant;
    const nodeUrl = m.connectedNodeUrl || m.viewOnlyNodeUrl || m.remoteNodeUrl;
    if (!nodeUrl) return;

    const node = REMOTE_NODES.find(n => n.url === nodeUrl) || { label: 'Custom', url: nodeUrl, ssl: true };
    const status = await testNode(node, 6000);

    if (status.connected) {
      get().updateMerchant({
        connectedNodeLabel: status.label,
        connectedNodeUrl: status.url,
        nodeStatus: status.status,
        nodeHeight: status.height,
        nodeLatencyMs: status.latencyMs,
        rpcConnected: true,
      });
    } else {
      // Auto-failover
      const fallback = await connectWithFailover(REMOTE_NODES, nodeUrl);
      if (fallback) {
        get().updateMerchant({
          connectedNodeLabel: fallback.status.label,
          connectedNodeUrl: fallback.node.url,
          nodeStatus: fallback.status.status,
          nodeHeight: fallback.status.height,
          nodeLatencyMs: fallback.status.latencyMs,
          rpcConnected: true,
          ...(m.walletMode === 'viewonly' ? { viewOnlyNodeUrl: fallback.node.url } : {}),
          ...(m.walletMode === 'remote' ? { remoteNodeUrl: fallback.node.url, remoteNodeSsl: fallback.node.ssl } : {}),
        });
      } else {
        get().updateMerchant({ nodeStatus: 'offline', rpcConnected: false });
      }
    }
  },

  createInvoice: async (description: string, fiatAmount: number, subscriptionId?: string) => {
    const m = get().merchant;
    let subaddress = '';
    let subaddressIndex: number | undefined;

    if (m.walletMode === 'viewonly' && m.viewOnlyAddress && m.viewOnlyViewKey) {
      // Generate subaddress locally using view key (no RPC needed)
      const nextIndex = m.viewOnlySubaddressIndex || 1;
      const result = await generateSubaddress(m.viewOnlyViewKey, m.viewOnlyAddress, nextIndex);
      subaddress = result.address;
      subaddressIndex = result.addressIndex;
      // Increment the counter
      get().updateMerchant({ viewOnlySubaddressIndex: nextIndex + 1 });
    } else {
      // Use RPC for managed/remote/selfcustody modes
      const config = get().getRpcConfig();
      try {
        const result = await createSubaddress(config, `Invoice: ${description}`);
        subaddress = result.address;
        subaddressIndex = result.addressIndex;
      } catch (e) {
        console.error('Failed to create subaddress via RPC:', e);
        throw new Error('Could not create subaddress. Check your wallet connection in Settings → Wallet & Node.');
      }
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

    if (new Date(invoice.expiresAt).getTime() < Date.now()) {
      get().updateInvoice(invoiceId, { status: 'expired' });
      return;
    }

    // For viewonly mode, we'd need a light client or indexer to check payments
    // For now, RPC-based polling works for managed/remote/selfcustody modes
    const m = get().merchant;
    if (m.walletMode === 'viewonly') {
      // View-only mode: cannot poll via standard wallet RPC
      // In production, this would use a view-key scanner service
      return;
    }

    const config = get().getRpcConfig();
    try {
      const transfers = await getTransfers(config, [invoice.subaddressIndex]);
      const incoming = [...transfers.in, ...transfers.pending].filter(
        t => t.subaddrIndex.minor === invoice.subaddressIndex
      );
      if (incoming.length === 0) return;

      const totalReceived = incoming.reduce((sum, t) => sum + t.amount, 0);
      const totalReceivedXmr = totalReceived / 1e12;
      const expectedXmr = invoice.xmrAmount;
      const primaryTx = incoming[0];
      const confirmations = primaryTx.confirmations || 0;

      let newStatus: Invoice['status'];
      if (totalReceivedXmr >= expectedXmr * 0.99) {
        if (confirmations >= 10) newStatus = 'paid';
        else if (confirmations >= 1) newStatus = 'confirming';
        else newStatus = 'seen_on_chain';
        if (totalReceivedXmr > expectedXmr * 1.01 && confirmations >= 10) newStatus = 'overpaid';
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
