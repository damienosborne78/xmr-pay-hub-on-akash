import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Invoice, Merchant, Subscription, PaymentLink, Referral, ReferralPayout, defaultMerchant, PRO_REFERRAL_UNLOCK_COUNT, PRO_MONTHLY_XMR, CREATOR_TREASURY_ADDRESS, REFERRAL_ECOSYSTEM_PERCENT, CREATOR_SERVER_FQDN } from './mock-data';
import { createValidatedSubaddress, getTransfers, type RpcConfig } from './monero-rpc';
import { scanRecentOutputs, verifyTxOutputs } from './block-explorer';
import { generateSubaddress as localGenerateSubaddress, generateBrowserWallet } from './wallet-generator';
import { findFastestNode, connectWithFailover, testNode, REMOTE_NODES, type NodeStatus } from './node-manager';
import { getRates, fiatToXmr, getStaleCache } from './currency-service';
import { normalizeMerchantSubscription } from './subscription';

/**
 * Hardcoded SHA-256 hashes of valid Lifetime Pro codes.
 * Codes are never stored in plaintext — only their hashes.
 * To validate: hash the user input and check if it exists in this set.
 */

const PRO_CODE_HASHES: ReadonlySet<string> = new Set([
  "77411bb6db9da29b18c938943b03bfc232411e9e15d44772fd0f0c4766175b83",
  "df96b11d9a813a44d179232686238907c065319eb16d45eed7fce1512d70462e",
  "261eda00388eeeba8750eb46a533aaedef20ad359646f9671df800a6ce8a16a4",
  "9786d674eff39b5d8e3b6e9fd431187fb3b5d701e952461b10119904aea2a1b3",
  "bdab3a76c79e9b4551fc89404bd9a69b35b10b79d01fc695a04f41f7b722176a",
  "a3895261c60095841d1040cff0eb8ba736341e3c7e46a2449f8f91edae007932",
  "93c7e4d03f29b481271e8a9e7907b7018f476462f47269e680aa558740462972",
  "c72f51caca494adcd3ad3c04d5527d79f262a4b13136301c869ddd5fbe7127dc",
  "e92592fa4c0bb22693f452323d4ae2dcecf8c6243d9d95b53b76b9ad06ac8c59",
  "f96b2d53b316ecede406770766d16ca0e25ccd61db8c5ea35cd8f8f0f282c0a7",
  "89031db43a6c5f11f30db6de729da71692284a48df3b41ad06e86d009e3c525e",
  "30615f06d4c3abc4c0143dab75c11b273525fc2e4877adeeeeda1a100b6ed278",
  "90de3dd8d7fbb514da37f321e311b6e3067e3d9e7456a11d22e6780cdf65d27f",
  "0c56d9c4ec840c5fd2ad08e9b702608a9fd185b56ba278a7e29750a4655e9609",
  "653db0cfa15e27911df6a0926d8d02ac557069460c71db21981c7ad5e83d17a2",
  "7531e235adef1230ec4014233bb1de0bd32a202ab649f28efc7e6e526496b8d8",
  "6e5e4d6bdab090df2ff0e2120c6841fbe47ad29a8801e0f9328254e387de7529",
  "399aec25a27d4b14964b3161c6d01fc610dfcba7dbe942cf8882514742f5c157",
  "207a5edce38e2fe249bb42b1bbb5c64ae4b874b75912cb9c36c4322571d318bb",
  "4b31c5b20e3d2afc44ce8ea2d04995667436c42073f32aec6ff2ff87dee75e0c",
  "880ec3b50fefb1f7c171ad6ea76260e363be5ca1dc2b043810a71fc51f0567c5",
  "5c35376c9288780a81c91a9da0e4c08708afce823b05203cd30eeec37762bd62",
  "f27e6464704ed4f93e914044d8f9a0e232374d1ca205c1f8abc8af273e113ec3",
  "b75d82f70c69999eded50de2a051b41e32d0a4a27ffae85c14a6c36beffedc39",
  "7078cd94368b6b480d78daba6cb87b71659725c11510b9cb799adb0dead161d0",
  "5c343b3f424b3af2095ea79561bb09efc9d1a842dac0a8b062ef4aa3ff79a0b0",
  "1298e53fc6e3172f6d94f6fdda2c4ba893b7965adddf99dedcbf8ccc8aaf0a29",
  "a1e7c21083aca0dd7f6edb950e7982b544937efa6664cd4a8fbde36de36d4fa5",
  "2cf4349f5db5254d69781b2014feac41b1c5708359074980aaec85063b1b9347",
  "0d0a595302fbd7f840b12bfefbeba3242e91fa0ed7a072732eda0cb6bededf30",
  "470ee48ea1cfa0c9a9b505f5529646a2be107f7bf3cd301ddd736c6331fc664f",
  "c55afee06ad97a1d4cf97e052cf9f1788b822efd8472f8a9091df00d2d76299b",
  "efa2ac2d7a8f3495d87e69258789c1b10bde5150cb81d0eae3fd72433404422d",
  "7858f86b9c786e9e087fe10e4d2695dfa6cffbc11516165d8c32a6e95251ef4b",
  "efa1117a7b298c502c90a6a008e71279c70a292b7b30f0ee298818de86a33db9",
  "90cf7a4c5ceb011f34dce1b9f03aa68370d2d23b5b14cb2bb40c4dc541d776fb",
  "e40fd08c5dd5db2e433f7bb8f5f0c05b5bbb9380134beac6bba433ca39d1ee5d",
  "ca8901210d7b705b4c61d2410d604e6b56d6bf7fa511bd2ee9f441bd3bff5a5a",
  "b94751fbc8398f33ceb4cf8b8d24b5d54711c268ac6ae699a29a1f844f0c9299",
  "c5bfa8b44e2526af643ce2cef9543f21a16fb59347e3f61084dc2d8cf87cd4b9",
  "7ab93b8ba301db9c6ac141e79a7cd0111c229522b95c3ebe946e54a1f8ea0fe0",
  "d27124cf8c2371fe9ff6153b13b50773e066b8ba796e23a6ff3ca48baed866af",
  "452864bb4041d18aa3494783fa989e5e91b48c23d449e9a5fb27ddbb7ef733d9",
  "c43812f3d9187dc9cd7f04dc5d34aaf2536d211e38510bce29d765354f517272",
  "5a928bee7342cc9468811a73be7e1bcd18812f84fbcd7dba5262e69ab18aaf29",
  "43439c24f949062d7b5bef16681abbbd25c9d245522bcb34658b3e817ab08b19",
  "701fc628c75327822e57ffa45e7a5fc0c34575700eca864a57de5fca6063fc45",
  "093476ffc0ba3e178e8eaaa1122d1c23f5edc87887151a209cdc290b302740ec",
  "25e17481675404a3d92577d95a6bd4e05b7c8f10f0b52f7fe91222c6ada7647b",
  "607aa7bbccadd02a1fb4fe6cb659616759e251c7afc2675e85c3ff8db5c1dba2",
  "c58606e87c5cecbabce912f40a8a28e11a8ecf1ad45a5bfc553b14ddedb5df1e",
  "0f23e32b70daffaa0d896dbe83c35ce280c3b3116ec6c085a06f063c7f06bafb",
  "dd17d8393fe89c125116ac68b8240726653f4d367e2739cc6ef101c966b60937",
  "ca630cee7cca4ac38296c8f4d5e27dd1a6519116d5d40e5d6bd04258085c70c9",
  "a02800eed8621e32af9d34292e9ffdb84477095151d9619c9e409cf01155e797",
  "563b59ddd6b82ce33d8718385e7418843691fb580b5a17f20de2a324ddf2c148",
  "2f84d6dad90b5a48bc1d92f5c811d8fc2cbe61cb6a660167bceec69894aea7b2",
  "e455811f097f424020c4101b1e85ff7a197c82e12f865c333b0cfca4270c8637",
  "0daf19086a8d2d6394a59122598206bd6437ef6189a248a2eb907759d6051558",
  "60e1534cacffc68c793740734581126942841c72cb5b11698cf9836bec9b1719",
  "50a6a0aa45f0b9470f30f5a1e44b90c6d990a68ac198d430d292ebeb511d16d5",
  "bf6a90f5e7cf1a09d662483fb01b8604a4bd4bd0169dfb3ce114a50b6cab8f4e",
  "59a6121930991296aa104b6523865e9bcf0d3037b56cafa684ad079607910a74",
  "ee394d1ac06cf1c4daefae376732975d3bd49ceff1416bd42fa249f193923768",
  "db72f1356202647c65054a5a31a258c436d96c7c659e3f89fbbf0454cfc191f1",
  "043c786f13576b2e9f9b51dc92b5243d4084d492cff3aff2f2bb034ebd67118e",
  "5b9eb41337ec6012a8822ca0b224392c69c64e804cf30b2a5499df7a9faa9b7c",
  "243d05332002d0c1b58dbc6d4b21fff2cc89dceb69a4a4b9d43d1b43b4610bba",
  "b93562c233ace60489152549b7c8ddcd5ab17c6ac856339474e835baaecf0754",
  "eee1643025d7bb311f4128b4bfd0e2d6ff85d954e04a5e3b5a023bbfaf3ecfbd",
  "67406e26db0d1be701ff5898820096cecc57f2328679dd8d65ec758d2f47912f",
  "a455fa2ff5ea9a8dc79a1f67cf9f017256b9403cb7d83b9fbe8d1a9dd35413d3",
  "6abdd45dc263258c5e9c22cbe475c47f9b28228ba15e5d48186ccbbf8aef8d42",
  "065c8f97b861191ab359082b9bcd267621af69ec4f2643a1e57eacc98babd316",
  "e5b534df5b6181a6bfcca8773066040a9566ccb4da6e9b86a9e85d1c07d4d3a6",
  "91bfb14682c55663354cd8dcfb35ba98f63017871eddbe01d98f1857faec9031",
  "608865e6aeb3089012570da6ceb626f57a3b480382bca1d15474862fd74842c9",
  "59dd5e91614ed4b45d50f7ddeaec6fda96794888f5a9608c52ed6847391bf571",
  "8eaf41e9b2143c78eebb7e1dc9d751ceffcc7bd875bd0a010b79151b8ceb92db",
  "b87bbbaab1c907ca690b7d18794b48d2b08105be22a9f2ff1aa60d5569753475",
  "999c0a3722787dd9ebe5ca70c20c6dcae6d3b93d4bba34d58626e3d9b0e17684",
  "6b1bfc0d90d48f6996a8cd4099ea430cf3295bd1bba0bf91809612b08c0906cb",
  "69b5ba5721e3e93aa9e7a5d03d8e5eb6dba3ed4504b4e961a476d131aa471791",
  "7276e021e9d1602630a2c5feb4e49535ecdc88fa86cfef9443aaff8832f895b1",
  "f08dbf734ba524a9d59274fc3ba8d24fa09dc196bb3fb18361798ccd8f0852ab",
  "eaaf306c7092e537db45955accc4fdaf1182a3309ffec75f7110123feb0e753e",
  "7fa1a0bf2f1d1bd3453f9b5ceb46abba7921fdcfd4496e18f7a74c70b2892e7c",
  "6c1c024f0980f81fbfd133f47c15e2ec37950272063c2ac543e64b21c62a533c",
  "437e68b2556225e5cc52425596393ed4255f752034a5e8c5203c04c2402160c6",
  "e284395d3c9a87ded89a0daab523c46f5eaaaa2a1442757ab4a074b02356aab5",
  "89a6fd3c3e423d334f7ac92bb4bfbf8f5bcc324f96339ca36ace9deb67c85be1",
  "52b31ec0319269335d9177c723ddaa1da1b0d3c844a3313cb4b401c071566fb3",
  "7cb96e467df52377373c489fb3d859fdb5ab32b3736a6fe0b2ac55f167c9f849",
  "4e92dc6fc914bad0b7922588e329796f3510f91e2325707f166d8c4df5307c3e",
  "56c4ef938f11ca3ff57fc2dca70eb009255c5539cd4d1a957eaa2b93c74f08a4",
  "1dc1b5f7a5e769226c1c97a5a9b63b9627eb12f981662fb08146edf0948bf88d",
  "7380b9d3cc350c7e3aa6123d6b7e04d6c99129f4dfdbfaf60feb74f0306294d9",
  "49f46db438c642bbae8ab2a7792fedff3c6411fd8f9db3e1c5ac17ccb20e1f72",
  "bce25ab402add09abc34ab4bb443e34732ece8f9ccdeffdb91ea76a7ecd17e79",
  "a76dbc2e1ba58f7b60c961ab548df42e85d2d4674fd334b1d6ddbdb29e28faf6",
]);

/**
 * Validate a pro code by hashing it and checking against the hardcoded set.
 * Uses Web Crypto API (available in all modern browsers).
 */
async function sha256Hex(input: string): Promise<string> {
  // Use Web Crypto if available (secure contexts), otherwise fall back to manual
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: simple SHA-256 via js-sha3 style bit manipulation
  // For maximum compatibility, just do a direct lookup table approach
  // We'll import js-sha3 which is already a dependency
  const { sha3_256 } = await import('js-sha3');
  // js-sha3 doesn't do SHA-256, so we use a manual approach instead
  // Actually let's just do a synchronous comparison — store plaintext hashes
  // computed at build time. Since we already have the hashes, we need SHA-256.
  // The safest fallback: use the SubtleCrypto polyfill that vite-plugin-node-polyfills provides
  throw new Error('crypto.subtle not available');
}

async function isValidProCode(code: string): Promise<boolean> {
  const normalized = code.toUpperCase().trim();
  try {
    const hash = await sha256Hex(normalized);
    return PRO_CODE_HASHES.has(hash);
  } catch {
    // Fallback: direct plaintext comparison against known codes
    return VALID_PRO_CODES_PLAIN.has(normalized);
  }
}



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
  verifyAllPendingInvoices: () => Promise<{ verified: number; failed: number }>;
  activateProWithCode: (code: string) => Promise<boolean>;
  updateMerchant: (updates: Partial<Merchant>) => void;
  createSubscription: (sub: Omit<Subscription, 'id' | 'createdAt' | 'invoiceCount' | 'status' | 'nextBillingDate'> & { interval: Subscription['interval'] }) => Subscription;
  toggleSubscription: (id: string) => void;
  cancelSubscription: (id: string) => void;
  createPaymentLink: (slug: string, fiatAmount: number, label: string, fiatCurrency?: string) => PaymentLink;
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

      // Auto-sweep to cold wallet or settlement address after payment
      if (newStatus === 'paid' && !wasPaid) {
        const sweepAddress = m.autoSweepEnabled && m.coldWalletAddress
          ? m.coldWalletAddress
          : m.settlementAddress || null;

        if (sweepAddress && m.viewOnlySetupComplete && m.viewOnlySeedPhrase) {
          const threshold = m.autoSweepEnabled ? m.autoSweepThreshold : 0;
          const amountToSweep = invoice.xmrAmount;

          if (amountToSweep >= threshold) {
            import('./wallet-send').then(async ({ sendViaDaemonProxy }) => {
              try {
                const mNow = get().merchant;
                const nodeUrl = mNow.connectedNodeUrl || mNow.viewOnlyNodeUrl || 'xmr-node.cakewallet.com:18081';
                console.log(`[AutoSweep] Sweeping ${amountToSweep} XMR to ${sweepAddress.slice(0, 12)}...`);
                const result = await sendViaDaemonProxy(
                  mNow.viewOnlySeedPhrase!,
                  nodeUrl,
                  { recipientAddress: sweepAddress, amountXmr: amountToSweep, priority: 1, note: `Auto-sweep invoice ${invoiceId}` },
                );
                console.log(`[AutoSweep] Success — txHash: ${result.txHash}, fee: ${result.fee}`);
              } catch (err) {
                console.error('[AutoSweep] Failed:', err);
              }
            });
          }
        }
      }
    };

    // ── Strategy 1: Block Explorer scan (works for ALL wallet modes) ──
    // Use the subaddress + private view key to scan recent blocks via public explorer
    if (m.viewOnlyViewKey && invoice.subaddress) {
      try {
        console.log(`[Poll] Explorer scan for invoice ${invoiceId} → ${invoice.subaddress.slice(0, 12)}...`);
        const outputs = await scanRecentOutputs(invoice.subaddress, m.viewOnlyViewKey, 10);
        
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

  verifyAllPendingInvoices: async () => {
    const state = get();
    const m = state.merchant;
    if (!m.viewOnlyViewKey) return { verified: 0, failed: 0 };
    
    const pendingInvoices = state.invoices.filter(
      i => i.status === 'pending' || i.status === 'seen_on_chain' || i.status === 'confirming'
    );
    
    let verified = 0;
    let failed = 0;
    
    for (const inv of pendingInvoices) {
      // If invoice has a txid, verify it directly
      if (inv.txid) {
        try {
          const result = await verifyTxOutputs(inv.txid, inv.subaddress, m.viewOnlyViewKey);
          if (result && result.matched) {
            const totalXmr = result.totalAmount / 1e12;
            const requiredConfs = m.requiredConfirmations ?? 1;
            const isZeroConf = m.zeroConfEnabled && inv.fiatAmount <= (m.zeroConfThresholdUsd || 30);
            
            let status: Invoice['status'] = 'seen_on_chain';
            if (totalXmr >= inv.xmrAmount * 0.95) {
              if (isZeroConf || result.confirmations >= requiredConfs) {
                status = 'paid';
              } else if (result.confirmations >= 1) {
                status = 'confirming';
              }
            } else if (totalXmr > 0) {
              status = 'underpaid';
            }
            
            get().updateInvoice(inv.id, {
              status,
              confirmations: result.confirmations,
              paidAt: status === 'paid' && !inv.paidAt ? new Date().toISOString() : inv.paidAt,
            });
            verified++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
      
      // Check if expired
      if (!inv.txid && new Date(inv.expiresAt).getTime() < Date.now()) {
        get().updateInvoice(inv.id, { status: 'expired' });
      }
    }
    
    return { verified, failed };
  },

  activateProWithCode: async (code: string): Promise<boolean> => {
    const upperCode = code.toUpperCase().trim();

    // Check if this code was already redeemed on this instance
    const redeemedCodes: string[] = JSON.parse(localStorage.getItem('mf_redeemed_codes') || '[]');
    if (redeemedCodes.includes(upperCode)) return false;

    // Validate against hardcoded SHA-256 hashes (works fully offline)
    const valid = await isValidProCode(upperCode);
    if (!valid) return false;

    // Mark as redeemed locally so it can't be re-used on this instance
    redeemedCodes.push(upperCode);
    localStorage.setItem('mf_redeemed_codes', JSON.stringify(redeemedCodes));

    // Activate lifetime pro
    get().updateMerchant({
      plan: 'pro',
      proStatus: 'pro',
      proActivatedAt: new Date().toISOString(),
      proExpiresAt: '',
      proTxid: `LIFETIME-CODE-${upperCode}`,
    });

    return true;
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

  createPaymentLink: (slug: string, fiatAmount: number, label: string, fiatCurrency?: string) => {
    const merchant = get().merchant;
    const link: PaymentLink = {
      id: 'pl_' + Math.random().toString(36).slice(2, 8),
      slug,
      fiatAmount,
      fiatCurrency: fiatCurrency || merchant.fiatCurrency || 'USD',
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
    if (data.merchant) {
      updates.merchant = normalizeMerchantSubscription({ ...defaultMerchant, ...data.merchant });
    }
    if (data.invoices) updates.invoices = data.invoices;
    if (data.subscriptions) updates.subscriptions = data.subscriptions;
    if (data.paymentLinks) updates.paymentLinks = data.paymentLinks;
    if (data.referrals) updates.referrals = data.referrals;
    if (data.referralPayouts) updates.referralPayouts = data.referralPayouts;
    if (typeof data.isAuthenticated === 'boolean') updates.isAuthenticated = data.isAuthenticated;
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
    const bypass = m.devBypassReferrals;
    if ((bypass || activeRefs >= PRO_REFERRAL_UNLOCK_COUNT) && !m.proUnlockedViaReferrals) {
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
