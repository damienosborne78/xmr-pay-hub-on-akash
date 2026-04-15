/**
 * Referral Telemetry Sync
 *
 * Periodically sends each user's referral data to the creator server
 * over HTTPS (port 443). Users are identified by their unique
 * wallet-derived referral code (e.g. "J84HX3").
 *
 * No sensitive data (keys, seeds) is ever transmitted.
 */

import { CREATOR_SERVER_FQDN } from './mock-data';

const SYNC_INTERVAL_MS = 60_000; // 60 seconds
const SYNC_ENDPOINT = `https://${CREATOR_SERVER_FQDN}/api/mf/referral/sync`;

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isFirstSyncDone = false;

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
  isFirstSync: boolean; // Backend uses this to count new signups vs returning users
}

/**
 * Collect referral telemetry from the Zustand store getter.
 */
function collectPayload(get: () => any): ReferralSyncPayload | null {
  const state = get();
  const merchant = state.merchant;

  const referralCode = merchant?.referralWalletFingerprint;
  if (!referralCode) return null; // No fingerprint yet — skip

  // Determine the pro code used (lifetime code path)
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
  };
}

async function doSync(get: () => any): Promise<void> {
  try {
    const payload = collectPayload(get);
    if (!payload) return;

    const syncPayload = {
      ...payload,
      isFirstSync: !isFirstSyncDone,
    };

    await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload),
    });

    if (!isFirstSyncDone) {
      isFirstSyncDone = true;
    }
  } catch {
    // Fail silently — offline-tolerant
  }
}

/**
 * Start the periodic referral sync. Call once after login.
 * @param get - Zustand store getter
 */
export function startReferralSync(get: () => any): void {
  stopReferralSync();
  // Immediate first sync
  doSync(get);
  // Periodic sync (every 60s)
  syncTimer = setInterval(() => doSync(get), SYNC_INTERVAL_MS);
}

/**
 * Stop the periodic sync. Call on logout / account deletion.
 */
export function stopReferralSync(): void {
  if (syncTimer !== null) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  isFirstSyncDone = false;
}
