import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Invoice, Merchant, Subscription, PaymentLink, Referral, ReferralPayout, defaultMerchant, PRO_REFERRAL_UNLOCK_COUNT, PRO_MONTHLY_XMR, CREATOR_TREASURY_ADDRESS, REFERRAL_ECOSYSTEM_PERCENT } from './mock-data';
import { createValidatedSubaddress, getTransfers, type RpcConfig } from './monero-rpc';
import { scanRecentOutputs, verifyTxOutputs } from './block-explorer';
import { generateSubaddress as localGenerateSubaddress, generateBrowserWallet } from './wallet-generator';
import { findFastestNode, connectWithFailover, testNode, REMOTE_NODES, type NodeStatus } from './node-manager';
import { getRates, fiatToXmr, getStaleCache } from './currency-service';

// ─── IndexedDB storage adapter for Zustand persist ───
function createIDBStorage() {
  const DB_NAME = 'moneroflow_store';
  const STORE_NAME = 'app_state';

  function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const db = await openDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(name);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => resolve(null);
        });
      } catch { return null; }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const db = await openDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(value, name);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      } catch { /* silently fail */ }
    },
    removeItem: async (name: string): Promise<void> => {
      try {
        const db = await openDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(name);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      } catch { /* silently fail */ }
    },
  };
}

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
  simulateInvoice: (description: string, fiatAmount: number) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  pollInvoicePayment: (invoiceId: string) => Promise<void>;
  verifyInvoiceTxHash: (invoiceId: string, txHash: string) => Promise<{ success: boolean; error?: string }>;
  updateMerchant: (updates: Partial<Merchant>) => void;
  createSubscription: (sub: Omit<Subscription, 'id' | 'createdAt' | 'invoiceCount' | 'status' | 'nextBillingDate'> & { interval: Subscription['interval'] }) => Subscription;
  toggleSubscription: (id: string) => void;
  cancelSubscription: (id: string) => void;
  createPaymentLink: (slug: string, fiatAmount: number, label: string) => PaymentLink;
  deletePaymentLink: (id: string) => void;
  getRpcConfig: () => RpcConfig;
  autoConnectNode: () => Promise<NodeStatus | null>;
  refreshNodeStatus: () => Promise<void>;
  restoreFromBackup: (data: any) => void;
  deleteAccount: () => void;
  activateProSubscription: (txid: string) => void;
  checkReferralProUnlock: () => boolean;
  generateReferralFingerprint: () => string;
}

export const useStore = create<AppState>()(persist((set, get) => ({
  isAuthenticated: false,
  merchant: defaultMerchant,
  invoices: [],
  subscriptions: [],
  paymentLinks: [],
  referrals: [],
  referralPayouts: [],

  login: () => {
    set({ isAuthenticated: true });
    // Auto-provision browser wallet if none exists
    const m = get().merchant;
    if (!m.viewOnlySetupComplete || !m.viewOnlyViewKey) {
      try {
        const w = generateBrowserWallet();
        get().updateMerchant({
          walletMode: 'viewonly',
          viewOnlyAddress: w.address,
          viewOnlyViewKey: w.viewKey,
          viewOnlySpendKey: w.spendKey,
          viewOnlyPublicSpendKey: w.publicSpendKey,
          viewOnlyPublicViewKey: w.publicViewKey,
          viewOnlySeedPhrase: w.seedPhrase,
          viewOnlySeedBackedUp: false,
          viewOnlyRestoreHeight: 0,
          viewOnlyNodeUrl: REMOTE_NODES[0].url,
          viewOnlySetupComplete: true,
          viewOnlySubaddressIndex: 1,
          nodeStatus: 'connecting',
        });
        // Generate referral fingerprint
        get().generateReferralFingerprint();
        // Auto-connect in background
        get().autoConnectNode();
      } catch (e) {
        console.error('[Store] Auto wallet generation failed:', e);
      }
    } else if (m.viewOnlySetupComplete && m.nodeStatus !== 'online') {
      get().autoConnectNode();
    }
    // Ensure referral fingerprint exists
    if (!get().merchant.referralWalletFingerprint) {
      get().generateReferralFingerprint();
    }
  },
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

    if (m.walletMode === 'viewonly' && m.viewOnlySetupComplete && m.viewOnlyViewKey && m.viewOnlyPublicSpendKey) {
      // Browser Wallet mode: derive subaddress locally using real Monero crypto
      const nextIndex = m.viewOnlySubaddressIndex || 1;
      try {
        subaddress = localGenerateSubaddress(
          m.viewOnlyViewKey,
          m.viewOnlyPublicSpendKey,
          0,
          nextIndex
        );
        subaddressIndex = nextIndex;
        // Increment for next invoice
        get().updateMerchant({ viewOnlySubaddressIndex: nextIndex + 1 });
        console.log('[Store] Generated local subaddress:', subaddress, 'index:', nextIndex);
      } catch (e) {
        console.error('[Store] Local subaddress generation failed:', e);
        throw new Error('Could not generate Monero subaddress. Please re-create your browser wallet in Settings → Wallet & Node.');
      }
    } else {
      // Other modes (remote, selfcustody, managed): use RPC create_address
      const config = get().getRpcConfig();
      const failoverConfigs: RpcConfig[] = REMOTE_NODES
        .filter(n => {
          const nodeEndpoint = `https://${n.url}`;
          return nodeEndpoint !== config.endpoint;
        })
        .slice(0, 2)
        .map(n => ({
          endpoint: `https://${n.url}`,
          username: '',
          password: '',
          walletFilename: '',
        }));

      try {
        const result = await createValidatedSubaddress(config, `Invoice: ${description}`, failoverConfigs);
        subaddress = result.address;
        subaddressIndex = result.addressIndex;
      } catch (e) {
        console.error('Failed to create validated subaddress:', e);
        throw new Error('Could not generate valid Monero address. Please try again or switch node in Settings → Wallet & Node.');
      }
    }

    // Fetch live rates for conversion
    let xmrAmount: number;
    try {
      const rates = await getRates();
      xmrAmount = Math.ceil(fiatToXmr(fiatAmount, m.fiatCurrency || 'USD', rates) * 1e6) / 1e6;
    } catch {
      // Fallback to stale cache
      const stale = getStaleCache();
      if (stale) {
        xmrAmount = Math.ceil(fiatToXmr(fiatAmount, m.fiatCurrency || 'USD', stale) * 1e6) / 1e6;
      } else {
        throw new Error('Could not fetch exchange rates. Please check your internet connection.');
      }
    }

    const invoice: Invoice = {
      id: 'inv_' + Math.random().toString(36).slice(2, 8),
      fiatAmount,
      fiatCurrency: m.fiatCurrency || 'USD',
      xmrAmount,
      subaddress,
      subaddressIndex,
      status: 'pending',
      confirmations: 0,
      createdAt: new Date().toISOString(),
      description,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      subscriptionId,
      createdBy: m.activePosUser || 'admin',
    };
    set(state => ({ invoices: [invoice, ...state.invoices] }));
    return invoice;
  },

  simulateInvoice: async (description: string, fiatAmount: number) => {
    const m = get().merchant;
    let xmrAmount: number;
    try {
      const rates = await getRates();
      xmrAmount = Math.ceil(fiatToXmr(fiatAmount, m.fiatCurrency || 'USD', rates) * 1e6) / 1e6;
    } catch {
      const stale = getStaleCache();
      xmrAmount = stale ? Math.ceil(fiatToXmr(fiatAmount, m.fiatCurrency || 'USD', stale) * 1e6) / 1e6 : 0.001;
    }

    const fakeTxHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const invoice: Invoice = {
      id: 'inv_' + Math.random().toString(36).slice(2, 8),
      fiatAmount,
      fiatCurrency: m.fiatCurrency || 'USD',
      xmrAmount,
      subaddress: m.viewOnlyAddress || '4' + 'x'.repeat(93),
      status: 'paid',
      confirmations: 10,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      description,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      txid: fakeTxHash,
      simulated: true,
      createdBy: 'admin',
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

    if (new Date(invoice.expiresAt).getTime() < Date.now()) {
      get().updateInvoice(invoiceId, { status: 'expired' });
      return;
    }

    const m = get().merchant;
    const requiredConfs = m.requiredConfirmations ?? 1;
    const isZeroConfEligible = m.zeroConfEnabled && invoice.fiatAmount <= (m.zeroConfThresholdUsd || 30);

    // Helper to process found payment data
    const processPayment = (totalReceivedXmr: number, confirmations: number, txid: string) => {
      const expectedXmr = invoice.xmrAmount;
      let newStatus: Invoice['status'];

      if (totalReceivedXmr >= expectedXmr * 0.95) {
        if (isZeroConfEligible && confirmations === 0) {
          newStatus = 'paid';
        } else if (confirmations >= requiredConfs) {
          newStatus = 'paid';
        } else if (confirmations >= 1) {
          newStatus = 'confirming';
        } else {
          newStatus = 'seen_on_chain';
        }
        if (totalReceivedXmr > expectedXmr * 1.05 && confirmations >= requiredConfs) newStatus = 'overpaid';
      } else if (totalReceivedXmr > 0) {
        newStatus = 'underpaid';
      } else {
        return; // nothing received
      }

      const wasPaid = invoice.status === 'paid';
      get().updateInvoice(invoiceId, {
        status: newStatus,
        confirmations,
        txid,
        paidAt: newStatus === 'paid' && !wasPaid ? new Date().toISOString() : invoice.paidAt,
      });

      // Fire webhook on payment confirmation
      if (newStatus === 'paid' && !wasPaid && m.webhookPaymentUrl) {
        fetch(m.webhookPaymentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment.confirmed',
            invoiceId, txid,
            amount: invoice.xmrAmount,
            fiatAmount: invoice.fiatAmount,
            fiatCurrency: invoice.fiatCurrency,
            confirmations,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
    };

    // ── Strategy 1: Block Explorer scan (works for ALL wallet modes) ──
    // Use the subaddress + private view key to scan recent blocks via public explorer
    if (m.viewOnlyViewKey && invoice.subaddress) {
      try {
        console.log(`[Poll] Explorer scan for invoice ${invoiceId} → ${invoice.subaddress.slice(0, 12)}...`);
        const outputs = await scanRecentOutputs(invoice.subaddress, m.viewOnlyViewKey, 10, true);
        
        if (outputs.length > 0) {
          const totalPico = outputs.reduce((sum, o) => sum + o.amount, 0);
          const totalXmr = totalPico / 1e12;
          const bestConf = Math.max(...outputs.map(o => o.confirmations));
          const primaryTxHash = outputs[0].txHash;
          console.log(`[Poll] Explorer found ${outputs.length} output(s), total: ${totalXmr} XMR, confs: ${bestConf}`);
          processPayment(totalXmr, bestConf, primaryTxHash);
          return;
        }
      } catch (e) {
        console.warn('[Poll] Explorer scan failed, trying RPC fallback:', e);
      }
    }

    // ── Strategy 2: If we have a known txid (from manual entry), verify it ──
    if (invoice.txid && m.viewOnlyViewKey) {
      try {
        const result = await verifyTxOutputs(invoice.txid, invoice.subaddress, m.viewOnlyViewKey);
        if (result && result.matched) {
          processPayment(result.totalAmount / 1e12, result.confirmations, invoice.txid);
          return;
        }
      } catch (e) {
        console.warn('[Poll] TX verify failed:', e);
      }
    }

    // ── Strategy 3: Wallet RPC (for managed/remote/selfcustody modes with real wallet-rpc) ──
    if (m.walletMode !== 'viewonly' && invoice.subaddressIndex !== undefined) {
      const config = get().getRpcConfig();
      try {
        const transfers = await getTransfers(config, [invoice.subaddressIndex]);
        const incoming = [...transfers.in, ...transfers.pending].filter(
          t => t.subaddrIndex.minor === invoice.subaddressIndex
        );
        if (incoming.length > 0) {
          const totalReceived = incoming.reduce((sum, t) => sum + t.amount, 0);
          processPayment(totalReceived / 1e12, incoming[0].confirmations || 0, incoming[0].txid);
          return;
        }
      } catch (e) {
        console.error('[Poll] RPC polling error:', e);
      }
    }

    console.log(`[Poll] No payment found yet for invoice ${invoiceId}`);
  },

  verifyInvoiceTxHash: async (invoiceId: string, txHash: string) => {
    const state = get();
    const invoice = state.invoices.find(i => i.id === invoiceId);
    if (!invoice) return { success: false, error: 'Invoice not found' };

    const m = state.merchant;
    const cleanHash = txHash.trim();

    if (!/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
      return { success: false, error: 'Invalid TX hash format. Must be 64 hex characters.' };
    }

    // First, save the txid so future polls can verify it
    get().updateInvoice(invoiceId, { txid: cleanHash });

    // Try to verify via explorer
    if (m.viewOnlyViewKey && invoice.subaddress) {
      try {
        const result = await verifyTxOutputs(cleanHash, invoice.subaddress, m.viewOnlyViewKey);
        if (result) {
          if (result.matched) {
            const totalXmr = result.totalAmount / 1e12;
            const requiredConfs = m.requiredConfirmations ?? 1;
            const isZeroConf = m.zeroConfEnabled && invoice.fiatAmount <= (m.zeroConfThresholdUsd || 30);
            
            let status: Invoice['status'] = 'seen_on_chain';
            if (totalXmr >= invoice.xmrAmount * 0.95) {
              if (isZeroConf || result.confirmations >= requiredConfs) {
                status = 'paid';
              } else if (result.confirmations >= 1) {
                status = 'confirming';
              }
            } else if (totalXmr > 0) {
              status = 'underpaid';
            }

            get().updateInvoice(invoiceId, {
              status,
              confirmations: result.confirmations,
              txid: cleanHash,
              paidAt: status === 'paid' ? new Date().toISOString() : undefined,
            });

            return { success: true };
          }
          return { success: false, error: 'TX found but no outputs match this payment address. Wrong transaction?' };
        }
      } catch (e) {
        console.warn('[VerifyTX] Explorer verification failed:', e);
      }
    }

    // Fallback: just mark as seen if we can't verify (will continue polling)
    get().updateInvoice(invoiceId, { txid: cleanHash, status: 'seen_on_chain' });
    return { success: true };
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

  restoreFromBackup: (data: any) => {
    const updates: any = {};
    if (data.merchant) updates.merchant = { ...defaultMerchant, ...data.merchant };
    if (data.invoices) updates.invoices = data.invoices;
    if (data.subscriptions) updates.subscriptions = data.subscriptions;
    if (data.paymentLinks) updates.paymentLinks = data.paymentLinks;
    if (data.referrals) updates.referrals = data.referrals;
    if (data.referralPayouts) updates.referralPayouts = data.referralPayouts;
    set(updates);
  },

  deleteAccount: () => {
    set({
      isAuthenticated: false,
      merchant: defaultMerchant,
      invoices: [],
      subscriptions: [],
      paymentLinks: [],
      referrals: [],
      referralPayouts: [],
    });
    try { indexedDB.deleteDatabase('moneroflow_store'); } catch {}
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    });
  },

  generateReferralFingerprint: () => {
    const m = get().merchant;
    if (m.referralWalletFingerprint) return m.referralWalletFingerprint;
    // Generate from wallet address or random
    const source = m.viewOnlyAddress || m.id || Math.random().toString(36);
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
    }
    const fingerprint = Math.abs(hash).toString(36).slice(0, 8).toUpperCase();
    get().updateMerchant({ referralWalletFingerprint: fingerprint, referralCode: fingerprint });
    return fingerprint;
  },

  activateProSubscription: (txid: string) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    get().updateMerchant({
      plan: 'pro',
      proStatus: 'pro',
      proTxid: txid,
      proActivatedAt: new Date().toISOString(),
      proExpiresAt: expiresAt.toISOString(),
    });
  },

  checkReferralProUnlock: () => {
    const m = get().merchant;
    const activeRefs = get().referrals.filter(r => r.level === 1).length;
    if (activeRefs >= PRO_REFERRAL_UNLOCK_COUNT && !m.proUnlockedViaReferrals) {
      get().updateMerchant({
        plan: 'pro',
        proStatus: 'pro_referral',
        proUnlockedViaReferrals: true,
        proExpiresAt: '', // never expires
      });
      return true;
    }
    return false;
  },
}), {
  name: 'moneroflow-state',
  storage: createJSONStorage(() => createIDBStorage()),
  partialize: (state) => ({
    isAuthenticated: state.isAuthenticated,
    merchant: state.merchant,
    invoices: state.invoices,
    subscriptions: state.subscriptions,
    paymentLinks: state.paymentLinks,
    referrals: state.referrals,
    referralPayouts: state.referralPayouts,
  }),
}));
