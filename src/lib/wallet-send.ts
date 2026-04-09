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

    // Connect to the remote daemon
    const protocol = nodeUrl.includes('443') ? 'https' : 'https';
    const daemonUrl = nodeUrl.startsWith('http') ? nodeUrl : `${protocol}://${nodeUrl}`;

    const daemon = await moneroTs.connectToDaemonRpc(daemonUrl);
    const daemonHeight = await daemon.getHeight();

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
      onSyncProgress(height: number, startHeight: number, endHeight: number, percentDone: number) {
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
    const balance = await wallet.getBalance();
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

    return {
      success: true,
      txHash,
      fee,
    };
  } catch (e: any) {
    // Clean up on failure
    try { if (wallet) await wallet.close(); } catch {}

    const errorMsg = e?.message || String(e);

    // Provide user-friendly error messages
    if (errorMsg.includes('not enough money') || errorMsg.includes('INSUFFICIENT')) {
      return { success: false, error: 'Insufficient funds to cover amount + network fee.' };
    }
    if (errorMsg.includes('Invalid address')) {
      return { success: false, error: 'Invalid recipient address. Please double-check.' };
    }
    if (errorMsg.includes('daemon') || errorMsg.includes('connection')) {
      return { success: false, error: 'Cannot connect to Monero node. Try switching nodes in Settings.' };
    }

    return { success: false, error: `Transaction failed: ${errorMsg}` };
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
    const protocol = nodeUrl.includes('443') ? 'https' : 'https';
    const daemonUrl = nodeUrl.startsWith('http') ? nodeUrl : `${protocol}://${nodeUrl}`;

    // Reuse or create persistent wallet
    if (!persistentWallet) {
      onProgress?.({ percent: 10, height: 0, targetHeight: 0, message: 'Initializing WASM wallet...' });

      const daemon = await moneroTs.connectToDaemonRpc(daemonUrl);
      const daemonHeight = await daemon.getHeight();
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
        onSyncProgress(height: number, _startHeight: number, endHeight: number, percentDone: number) {
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

    return { success: true, txHash, fee };
  } catch (e: any) {
    // If persistent wallet errors, clean it up
    try { if (persistentWallet) { await persistentWallet.close(); persistentWallet = null; } } catch {}

    return {
      success: false,
      error: `Transaction failed: ${e?.message || String(e)}`,
    };
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
