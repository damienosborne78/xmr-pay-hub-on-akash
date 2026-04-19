/**
 * Referral Telemetry Sync
 *
 * Periodically sends each user's referral data to the creator server
 * over HTTPS (port 443). Users are identified by their unique
 * wallet-derived referral code (e.g. "J84HX3").
 *
 * No sensitive data (keys, seeds) is ever transmitted.
 *
 * ROBUST MULTI-USER DESIGN:
 * - Singleton pattern prevents duplicate sync instances
 * - Always recovers from errors (never permanently stops)
 * - Exponential backoff for failures
 * - Re-triggers on tab visibility changes
 */

import { CREATOR_SERVER_FQDN } from './mock-data';

const SYNC_INTERVAL_MS = 60_000; // 60 seconds
const MAX_RETRY_BACKOFF_MS = 300_000; // 5 minutes max backoff
const SYNC_ENDPOINT = `https://${CREATOR_SERVER_FQDN}/api/mf/referral/sync`;

// Global singleton state - prevents multiple sync instances
let syncTimer: ReturnType<typeof setInterval> | null = null;
let getStore: (() => any) | null = null;
let failedAttempts = 0;
let lastSuccessTime = 0;

// Cleanup on visibility handler
let visibilityHandler: (() => void) | null = null;

export interface ReferralSyncPayload {
  referralCode: string;
  proCode: string | null;
  referredBy: string | null;
  proStatus: 'free' | 'pro';
  proActivatedAt: string | null;
  referrals: Array<{
    username: string;
    level: number;
    commission: number;
    status: string;
    joinedAt: string;
  }>;
  referralPayouts: Array<{
    xmrAmount: number;
    date: string;
    from: string;
    level: number;
    status: string;
  }>;
  lastSyncAt: string;
  isFirstSync: boolean;
}

/**
 * Collect referral telemetry from the Zustand store getter.
 */
function collectPayload(): ReferralSyncPayload | null {
  if (!getStore) return null;
  
  const state = getStore();
  const merchant = state?.merchant;

  const referralCode = merchant?.referralWalletFingerprint;
  if (!referralCode) return null;

  let proCode: string | null = null;
  if (merchant.proTxid && typeof merchant.proTxid === 'string') {
    if (merchant.proTxid.startsWith('LIFETIME-CODE-')) {
      proCode = merchant.proTxid.replace('LIFETIME-CODE-', '');
    } else {
      proCode = merchant.proTxid;
    }
  }

  return {
    referralCode,
    proCode,
    referredBy: merchant.referredBy || null,
    proStatus: (merchant.proStatus === 'pro' || merchant.proStatus === 'pro_referral') ? 'pro' : 'free',
    proActivatedAt: merchant.proActivatedAt || null,
    referrals: (state.referrals || []).map((r: any) => ({
      username: r.username || r.name || '',
      level: r.level ?? 1,
      commission: r.commission ?? 0,
      status: r.status || 'active',
      joinedAt: r.joinedAt || r.createdAt || '',
    })),
    referralPayouts: (state.referralPayouts || []).map((p: any) => ({
      xmrAmount: p.xmrAmount ?? p.amount ?? 0,
      date: p.date || p.createdAt || '',
      from: p.from || '',
      level: p.level ?? 1,
      status: p.status || 'pending',
    })),
    lastSyncAt: new Date().toISOString(),
    isFirstSync: lastSuccessTime === 0,
  };
}

/**
 * Calculate exponential backoff based on failed attempts
 */
function getNextSyncDelay(): number {
  if (failedAttempts === 0) return SYNC_INTERVAL_MS;
  
  const backoffSeconds = Math.min(60 * Math.pow(2, failedAttempts - 1), MAX_RETRY_BACKOFF_MS / 1000);
  const delayMs = Math.floor(backoffSeconds * 1000);
  
  console.log(`[ReferralSync] Next sync in ${Math.floor(delayMs/1000)}s (failedAttempts: ${failedAttempts})`);
  return delayMs;
}

/**
 * Perform a single sync attempt
 */
async function doSync(): Promise<boolean> {
  if (!getStore) return false;
  
  try {
    const payload = collectPayload();
    if (!payload) {
      console.log('[ReferralSync] No referral code yet, skipping');
      return false;
    }

    console.log(`[ReferralSync] Syncing user ${payload.referralCode}...`, payload);

    const response = await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      failedAttempts = 0;
      lastSuccessTime = Date.now();
      console.log('[ReferralSync] Sync success ✅');
      return true;
    } else {
      failedAttempts++;
      console.error(`[ReferralSync] Sync failed: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    failedAttempts++;
    console.error('[ReferralSync] Sync error:', error);
    return false;
  }
}

/**
 * Sync loop with exponential backoff and guaranteed restart
 */
function syncLoop(): void {
  syncTimer = setTimeout(async () => {
    await doSync();
    // ALWAYS restart the loop, even if sync failed (robustness key!)
    syncLoop();
  }, getNextSyncDelay());
}

/**
 * Start the periodic referral sync (Singleton - idempotent)
 * @param get - Zustand store getter
 */
export function startReferralSync(get: () => any): void {
  // Singleton: if already running with same store getter, do nothing
  if (syncTimer !== null && getStore === get) {
    console.log('[ReferralSync] Already running, skipping duplicate start');
    return;
  }
  
  // If running with different store getter, stop first
  if (syncTimer !== null) {
    console.log('[ReferralSync] Stopping previous sync instance');
    stopReferralSync();
  }
  
  // Store the getter
  getStore = get;
  failedAttempts = 0;
  lastSuccessTime = 0;
  
  console.log('[ReferralSync] Starting sync loop');
  
  // Immediate first sync
  doSync();
  
  // Start loop
  syncLoop();
  
  // Set up visibility handler to retry sync when user returns
  if (typeof window !== 'undefined' && !visibilityHandler) {
    visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        console.log('[ReferralSync] User returned to tab - attempting immediate sync');
        doSync();
      }
    };
    window.addEventListener('visibilitychange', visibilityHandler);
  }
}

/**
 * Stop the periodic sync
 */
export function stopReferralSync(): void {
  if (syncTimer !== null) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  if (visibilityHandler && typeof window !== 'undefined') {
    window.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  getStore = null;
  failedAttempts = 0;
  lastSuccessTime = 0;
  console.log('[ReferralSync] Stopped');
}

/**
 * Manual sync trigger (for debugging or force refresh)
 */
export async function triggerManualSync(): Promise<boolean> {
  return await doSync();
}
