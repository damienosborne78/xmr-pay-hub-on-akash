import { REMOTE_NODES } from './node-manager';

// ── Balance Cache ──────────────────────────────────────────────────────────
const BALANCE_CACHE_KEY = 'mf_wallet_balance_cache';

export interface BalanceCache {
  balance: number;
  unlockedBalance: number;
  timestamp: number;
}

export function getCachedBalance(): BalanceCache | null {
  try {
    const raw = localStorage.getItem(BALANCE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BalanceCache;
    // Expire after 30 minutes
    if (Date.now() - parsed.timestamp > 30 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedBalance(balance: number, unlockedBalance: number): void {
  const cache: BalanceCache = { balance, unlockedBalance, timestamp: Date.now() };
  localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(cache));
}

export function clearBalanceCache(): void {
  localStorage.removeItem(BALANCE_CACHE_KEY);
}

/**
 * Real Monero Transaction Sending Service
 *
 * Two modes:
 * 1. "proxy" (Daemon Proxy) — Lazy-loads monero-ts WASM only when sending.
 *    Creates a temporary in-memory wallet from seed, syncs minimally, constructs
 *    and broadcasts the TX, then closes. Lower memory footprint, slower per-send.
 *
 * 2. "wasm" (Full WASM) — Keeps a persistent WASM wallet instance synced in
 *    the background. Instant sends but uses more CPU/memory continuously.
 *
 * Both use the same underlying monero-ts library for real RingCT transaction
 * construction and signing. All keys stay in the browser.
 */

export type SendMode = 'proxy' | 'wasm';

export interface SendRequest {
  recipientAddress: string;
  amountXmr: number;
  priority: number; // 1=normal, 2=elevated, 3=urgent
  note?: string;
}

export interface SendResult {
  success: boolean;
  txHash?: string;
  fee?: number; // in XMR
  error?: string;
}

export interface SyncProgress {
  percent: number;
  height: number;
  targetHeight: number;
  message: string;
}

// Singleton for WASM mode persistent wallet
let persistentWallet: any = null;
let persistentDaemonConnection: any = null;

function isSecureBrowserContext(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

function normalizeNodeUrl(nodeUrl: string): string {
  return nodeUrl.trim().replace(/\/+$/, '');
}

function getDaemonUrlCandidates(nodeUrl: string): string[] {
  const normalized = normalizeNodeUrl(nodeUrl);
  if (!normalized) return [];

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return [normalized];
  }

  const knownNode = REMOTE_NODES.find((node) => node.url === normalized);
  const candidates = new Set<string>();

  // Production preview runs over HTTPS, so browser wallet nodes must also be HTTPS-capable.
  if (knownNode?.ssl || isSecureBrowserContext() || normalized.includes(':443')) {
    candidates.add(`https://${normalized}`);
  }

  // Only try plain HTTP outside secure browser contexts to avoid mixed-content failures.
  if (!isSecureBrowserContext()) {
    candidates.add(`http://${normalized}`);
  }

  return Array.from(candidates);
}

async function connectToReachableDaemon(moneroTs: any, nodeUrl: string): Promise<{ daemon: any; daemonUrl: string; daemonHeight: number }> {
  const candidates = getDaemonUrlCandidates(nodeUrl);
  const attempted: string[] = [];
  let lastError = '';

  for (const candidate of candidates) {
    attempted.push(candidate);
    try {
      const daemon = await moneroTs.connectToDaemonRpc(candidate);
      const daemonHeight = await daemon.getHeight();
      return { daemon, daemonUrl: candidate, daemonHeight };
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }

  const secureHint = isSecureBrowserContext()
    ? ' This app is running over HTTPS, so the connected Monero node must support HTTPS too.'
    : '';

  throw new Error(
    `Could not reach Monero node. Tried: ${attempted.join(', ') || nodeUrl}.${secureHint}${lastError ? ` Last error: ${lastError}` : ''}`,
  );
}

function mapSendError(errorMsg: string): SendResult {
  if (errorMsg.includes('Could not reach Monero node')) {
    return { success: false, error: errorMsg };
  }
  if (errorMsg.includes('not enough money') || errorMsg.includes('INSUFFICIENT')) {
    return { success: false, error: 'Insufficient funds to cover amount + network fee.' };
  }
  if (errorMsg.includes('Invalid address')) {
    return { success: false, error: 'Invalid recipient address. Please double-check.' };
  }
  if (
    errorMsg.includes('Request failed without response') ||
    errorMsg.includes('AxiosError: Network Error') ||
    errorMsg.includes('Network Error') ||
    errorMsg.includes('mixed content') ||
    errorMsg.includes('daemon') ||
    errorMsg.includes('connection')
  ) {
    return {
      success: false,
      error: 'Cannot connect to the selected Monero node from this browser. Use an HTTPS-enabled node in Settings → Wallet & Node.',
    };
  }

  return { success: false, error: `Transaction failed: ${errorMsg}` };
}

/**
 * Send real XMR using the daemon proxy approach.
 * Lazy-loads monero-ts, creates a temporary wallet, syncs, sends, closes.
 */
export async function sendViaDaemonProxy(
  seedPhrase: string,
  nodeUrl: string,
  request: SendRequest,
  onProgress?: (progress: SyncProgress) => void,
): Promise<SendResult> {
  let wallet: any = null;

  try {
    onProgress?.({ percent: 5, height: 0, targetHeight: 0, message: 'Loading wallet engine...' });

    // Dynamic import — only loads the ~50MB WASM when actually sending
    const moneroTs = await import('monero-ts');

    onProgress?.({ percent: 15, height: 0, targetHeight: 0, message: 'Connecting to daemon...' });

    const { daemonUrl, daemonHeight } = await connectToReachableDaemon(moneroTs, nodeUrl);

    onProgress?.({ percent: 25, height: 0, targetHeight: daemonHeight, message: 'Creating wallet from seed...' });

    // Create in-memory wallet from mnemonic seed
    wallet = await moneroTs.createWalletFull({
      password: '',
      networkType: moneroTs.MoneroNetworkType.MAINNET,
      seed: seedPhrase,
      server: daemonUrl,
      restoreHeight: Math.max(0, daemonHeight - 5000), // Only sync recent blocks for speed
    });

    onProgress?.({ percent: 35, height: 0, targetHeight: daemonHeight, message: 'Syncing wallet (this may take a moment)...' });

    // Sync the wallet with progress updates
    await wallet.sync(new class extends moneroTs.MoneroWalletListener {
      async onSyncProgress(height: number, startHeight: number, endHeight: number, percentDone: number, _message: string): Promise<void> {
        onProgress?.({
          percent: 35 + Math.floor(percentDone * 40),
          height,
          targetHeight: endHeight,
          message: `Syncing blocks... ${Math.floor(percentDone * 100)}%`,
        });
      }
    });

    onProgress?.({ percent: 80, height: daemonHeight, targetHeight: daemonHeight, message: 'Constructing transaction...' });

    // Get balance check
    const unlockedBalance = await wallet.getUnlockedBalance();
    const amountPico = BigInt(Math.round(request.amountXmr * 1e12));

    if (unlockedBalance < amountPico) {
      return {
        success: false,
        error: `Insufficient unlocked balance. Available: ${Number(unlockedBalance) / 1e12} XMR, Required: ${request.amountXmr} XMR`,
      };
    }

    onProgress?.({ percent: 85, height: daemonHeight, targetHeight: daemonHeight, message: 'Signing and broadcasting...' });

    // Create and relay the transaction
    const tx = await wallet.createTx({
      accountIndex: 0,
      address: request.recipientAddress,
      amount: amountPico.toString(),
      priority: request.priority,
      relay: true, // Broadcast immediately
    });

    const txHash = tx.getHash();
    const fee = Number(tx.getFee()) / 1e12;

    onProgress?.({ percent: 100, height: daemonHeight, targetHeight: daemonHeight, message: 'Transaction broadcast!' });

    // Close the temporary wallet
    await wallet.close();

    // Invalidate balance cache after successful send
    clearBalanceCache();

    return {
      success: true,
      txHash,
      fee,
    };
  } catch (e: any) {
    // Clean up on failure
    try { if (wallet) await wallet.close(); } catch {}

    const errorMsg = e?.message || String(e);
    return mapSendError(errorMsg);
  }
}

/**
 * Send real XMR using the full WASM wallet (persistent, background-synced).
 * The wallet stays open and synced for instant sends.
 */
export async function sendViaWasmWallet(
  seedPhrase: string,
  nodeUrl: string,
  request: SendRequest,
  onProgress?: (progress: SyncProgress) => void,
): Promise<SendResult> {
  try {
    const moneroTs = await import('monero-ts');

    // Reuse or create persistent wallet
    if (!persistentWallet) {
      onProgress?.({ percent: 10, height: 0, targetHeight: 0, message: 'Initializing WASM wallet...' });

      const { daemon, daemonUrl, daemonHeight } = await connectToReachableDaemon(moneroTs, nodeUrl);
      persistentDaemonConnection = daemon;

      persistentWallet = await moneroTs.createWalletFull({
        password: '',
        networkType: moneroTs.MoneroNetworkType.MAINNET,
        seed: seedPhrase,
        server: daemonUrl,
        restoreHeight: Math.max(0, daemonHeight - 10000),
      });

      onProgress?.({ percent: 30, height: 0, targetHeight: daemonHeight, message: 'Initial sync...' });

      await persistentWallet.sync(new class extends moneroTs.MoneroWalletListener {
        async onSyncProgress(height: number, _startHeight: number, endHeight: number, percentDone: number, _message: string): Promise<void> {
          onProgress?.({
            percent: 30 + Math.floor(percentDone * 45),
            height,
            targetHeight: endHeight,
            message: `Syncing... ${Math.floor(percentDone * 100)}%`,
          });
        }
      });

      // Start background sync
      await persistentWallet.startSyncing(30000); // every 30s
    } else {
      // Wallet already exists — quick sync
      onProgress?.({ percent: 50, height: 0, targetHeight: 0, message: 'Quick sync...' });
      await persistentWallet.sync();
    }

    onProgress?.({ percent: 80, height: 0, targetHeight: 0, message: 'Constructing transaction...' });

    const amountPico = BigInt(Math.round(request.amountXmr * 1e12));
    const unlockedBalance = await persistentWallet.getUnlockedBalance();

    if (unlockedBalance < amountPico) {
      return {
        success: false,
        error: `Insufficient unlocked balance. Available: ${Number(unlockedBalance) / 1e12} XMR`,
      };
    }

    onProgress?.({ percent: 90, height: 0, targetHeight: 0, message: 'Broadcasting...' });

    const tx = await persistentWallet.createTx({
      accountIndex: 0,
      address: request.recipientAddress,
      amount: amountPico.toString(),
      priority: request.priority,
      relay: true,
    });

    const txHash = tx.getHash();
    const fee = Number(tx.getFee()) / 1e12;

    onProgress?.({ percent: 100, height: 0, targetHeight: 0, message: 'Transaction broadcast!' });

    // Invalidate balance cache after successful send
    clearBalanceCache();

    return { success: true, txHash, fee };
  } catch (e: any) {
    // If persistent wallet errors, clean it up
    try { if (persistentWallet) { await persistentWallet.close(); persistentWallet = null; } } catch {}

    const errorMsg = e?.message || String(e);
    return mapSendError(errorMsg);
  }
}

/**
 * Close the persistent WASM wallet (cleanup).
 */
export async function closePersistentWallet(): Promise<void> {
  if (persistentWallet) {
    try {
      await persistentWallet.stopSyncing();
      await persistentWallet.close();
    } catch {}
    persistentWallet = null;
    persistentDaemonConnection = null;
  }
}

/**
 * Get wallet balance using WASM (for full mode).
 */
export async function getWasmWalletBalance(
  seedPhrase: string,
  nodeUrl: string,
): Promise<{ balance: number; unlockedBalance: number } | null> {
  try {
    if (persistentWallet) {
      await persistentWallet.sync();
      const balance = Number(await persistentWallet.getBalance()) / 1e12;
      const unlockedBalance = Number(await persistentWallet.getUnlockedBalance()) / 1e12;
      return { balance, unlockedBalance };
    }
    return null;
  } catch {
    return null;
  }
}
