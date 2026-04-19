# MoneroFlow Backups

This folder contains incremental backups for all feature fixes.

---

## Landing Page Features Balance

### Backup: landing-page-features-balance-20260417-162516.tar.gz

### Balanced Feature Grid Layout
- **Cold Wallet Auto Sweep Card:** Explains auto-sweep feature for cold wallet security
- **Anonymous Payment Links Card:** Highlights payment links + instant CSV inventory import
- Brings total to 12 feature cards (now balanced: 6 per row)
- Concise copy matching existing card lengths
- Added icons: `Send` for Cold Wallet, `Link2` for Payment Links

### Cards Added:
1. **Cold Wallet Auto Sweep** (Send icon)
   - Auto-sweep accumulated payments to cold wallet
   - Threshold-based automated security
   - Near-zero merchant risk messaging
   
2. **Anonymous Payment Links** (Link2 icon)
   - Permanent payment links for existing websites
   - Accept anonymous payments anywhere
   - Instant CSV import for rapid deployment
   - Expand payment capabilities seamlessly

### Files Changed
- src/pages/LandingPage.tsx - Added 2 new feature cards

---

## Referral Sync Final Working Fix

### Backup: referral-sync-final-working-20260417-155616.tar.gz ✅ TESTED & WORKING

### Production-Ready Multi-User Referral Sync
- **Fixed:** sync now starts automatically on Dashboard mount (no button clicks needed)
- **Fixed:** singleton pattern prevents duplicate sync instances
- **Fixed:** stable store reference using `useRef` prevents spam bursts
- **Robust:** exponential backoff for failures (60s → 5min max)
- **Robust:** never permanently stops - always retries
- **Robust:** visibility change triggers immediate sync when user returns
- **Scalable:** jitter added to prevent thundering herd (1000s of concurrent users)
- **Robust:** new instances kill old sync timers automatically on load

### Test Results
- ✅ Works without cookie clearing
- ✅ Works after page refresh
- ✅ Works when visiting `/dashboard` directly
- ✅ Multiple users on same domain (isolated instances)
- ✅ Console logs show sync status clearly
- ✅ Backend logs show steady 1 sync/60s per user

### Key Changes
**referral-sync.ts:**
- Complete rewrite with robust error handling
- Global timer storage for cross-instance cleanup
- Jitter (0-5s random) prevents thundering herd
- Exponential backoff with 5min maximum
- Visibility handler with jitter (1-3s)
- Console logging for debugging
- Singleton pattern guarantees only one sync per store

**DashboardLayout.tsx:**
- `useRef` to prevent multiple starts on re-renders
- `useStore.getState` for stable store reference
- Check sync flag to only start once on mount

### Privacy Note
- Only referral telemetry is sent (referral code, pro status, referral stats)
- No private keys, seeds, wallet addresses, or transaction details transmitted
- Sync happens automatically once per 60s (with jitter/before/visibility)
- Clearly labeled as "Privacy Focused Referrals Data Only"

### Files Changed
- src/lib/referral-sync.ts - Complete robust rewrite
- src/components/DashboardLayout.tsx - Stable mount sync

---

## Referral Sync Robust Cleanup (Previous Version)

### Backup: referral-sync-robust-multi-user-20260417-151005.tar.gz

### Singleton Pattern for Multi-User Environments
- Implemented robust singleton pattern to prevent multiple sync instances
- Handles multiple users on same domain without sync duplication
- Exponential backoff on failures (starts at 60s, ramps to 5min max)
- Guaranteed recovery: sync loop always restarts, never permanently stops
- Visibility change triggers immediate sync when user returns to tab
- Console logging for debugging (shows sync loop, failures, retry times)

### Root Cause Fixed
Multiple sync instances were being created (login() + DashboardLayout), causing:
- Parallel timers competing for same endpoint
- Failed syncs causing some instances to die
- No recovery mechanism for failed syncs
- Users saw NO API calls until clicking landing page button

### Key Changes
- **referral-sync.ts**: Complete rewrite with singleton, robustness, logging
- **DashboardLayout.tsx**: Simplified to check localStorage on mount, idempotent start
- **startReferralSync**: Now idempotent - safe to call multiple times

### Robustness Features
- ✅ Singleton: Only one sync instance per store getter
- ✅ Always recovers: Sync loop restarts even after failures
- ✅ Exponential backoff: 60s → 120s → 240s → 480s → 5min (max)
- ✅ Visibility retry: Immediate sync when user returns to tab
- ✅ Console logs: Debug sync status, retry times, failures
- ✅ Multi-user safe: Handles multiple isolated instances on same domain

### Privacy Note (Same as before)
- Only referral telemetry is sent (referral code, pro status, referral stats)
- No private keys, seeds, wallet addresses, or transaction details transmitted
- Sync happens automatically once per minute (or with backoff on failures)
- Clearly labeled as "Privacy Focused Referrals Data Only"

### Files Changed
- src/lib/referral-sync.ts - Complete rewrite with singleton and robustness
- src/components/DashboardLayout.tsx - Simplified to localStorage check, idempotent

---

## Referral Sync Auto-Start (Previous Attempt)

### Backup: referral-sync-auto-start-20260417-141721.tar.gz

### Referral Telemetry Auto-Start on Dashboard
- Fixed referral sync not starting when users refresh or visit `/dashboard` directly
- Previously sync only started on fresh login via "Start Accepting XMR" button
- Now sync auto-starts in DashboardLayout when already authenticated
- Privacy-focused minimal telemetry (no keys/seeds sent, only referral data)
- Sync runs every 60s and sends: referral code, pro status, referral stats
- Fixes bug where dashboard users saw ZERO sync calls for hours

### Files Changed
- src/lib/referral-sync.ts - Improved error handling, exponential backoff, visibility state handling
- src/components/DashboardLayout.tsx - Added useEffect to auto-start sync when authenticated

### Privacy Note
- Only referral telemetry is sent (referral code, pro status, referral stats)
- No private keys, seeds, wallet addresses, or transaction details transmitted
- Sync happens automatically once per 60s while user is authenticated
- Requirement: Monero values privacy — sync is clearly labeled in code as "Privacy Focused Referrals Data Only"

---

## Backend Timezone Fix

### Backup: mf-backend-timezone-fix-20260417-134527.tar.gz

### AEST Timezone for Backend Logs
- Fixed access.log timezone showing UTC instead of AEST
- Custom morgan token outputs ISO-8601 with timezone offset
- Current DST-aware offset: +10:00 when standard, +11:00 when DST active
- Fixed PM2 restart issue (45 restarts due to port conflicts)
- Backend logs now display correct timestamps matching server time

### Files Changed
- mf-backend/index-final.js - Added timezone-aware logging, PM2 restart

---

## Payment Links QR Removal

### Backup: payment-links-remove-qr-20260416-224449.tar.gz

### Simplified Payment Links
- Removed confusing "Show QR" button from payment links
- Removed "Download QR" button and QR code display
- Payment links are URL-based, not QR-based (generates fresh invoices on each visit)
- Clean UI with only Copy / External Link / Delete buttons
- Removes user confusion about non-scannable URL-based QR codes

### Files Changed
- src/pages/dashboard/PaymentLinksPage.tsx - QR-related code removed, import cleanup

---

## Landing Page Nav Clean

### Backup: landing-page-nav-clean-20260416-215821.tar.gz ✅ TESTED

### Nav Simplification
- Removed "Log in" and "Get Started Free" buttons from top nav
- Nav now only shows BrandLogo
- /login path remains accessible for manual seed restoration
- Hero CTAs still work for auto-onboard flow
- Removes friction/confusion for new Monero users

### Files Changed
- src/pages/LandingPage.tsx - Removed nav buttons, kept BrandLogo only

---

## Referral Link Fix

### Backup: referral-link-fix-20260416-213743.tar.gz ✅ TESTED & WORKING

### Referral Link Updater
- Fixed COPY button on referral code now copies full URL
- Added clipboard fallback for non-secure contexts
- Referral URL format: `https://moneroflow.com/?ref={REFERRAL_CODE}`
- Links include domain and referral code param

### Referral Onboarding Flow
When new user clicks referral link:
1. **Auto-onboard** via "Start Accepting XMR" -> generates new browser wallet
2. **Auto-connect** to node (same as normal signup)
3. **Auto-credit** referrer's code to new user's `referredBy` field
4. New user sees "Referred by: {REFERRAL_CODE}" on their Referrals tab

### Files Changed
- src/pages/dashboard/ReferralsPage.tsx - Copy button outputs full URL, QR code now shows URL
- src/pages/LandingPage.tsx - Added `?ref=` param handling, auto-credits referrer on signup

### Copy Behavior
When user clicks COPY button, it copies:
```
https://moneroflow.com/?ref=9IB8LK38D2
```

The referrer's code is automatically applied when new user signs up.

---

## Payment Links Fixes

### Backup 1: payment-links-fix-20260416-202329.tar.gz

### Initial Payment Links Fix
- Fixed payment links URL format
- Added cleanup to PayPage useEffect
- Restored paymentlinks functions from GitHub
- Removed `baseId` field from PaymentLink interface

---

### Backup 2: payment-links-fix-uniqueId-20260416-210059.tar.gz

### Unique IDs for Cross-User Isolation
- Added `uniqueId` field (10 random chars) to each payment link
- URL format: `/pay/{uniqueId}/{amount}/{slug}?currency=...&symbol=...`
- Links found by `uniqueId` instead of slug/amount combos
- **No URL clashes even with thousands of concurrent users**

### Files Changed
- src/App.tsx - Updated route: `/pay/:uniqueId/:amount/:label`
- src/pages/PayPage.tsx - Finds link by uniqueId, unique invoice per visitor
- src/pages/dashboard/PaymentLinksPage.tsx - Unique IDs, copy button (broken in this version)
- src/pages/dashboard/InvoicesPage.tsx - Auto-refresh every 10s + storage listener
- src/lib/store.ts - Added `uniqueId` generation
- src/lib/mock-data.ts - Added `uniqueId` to PaymentLink interface

### Payment Links Flow
1. **Permanent link (doesn't change):**
   ```
   https://moneroflow.com/pay/a8x7s3k2j9/0.1/cake-payment?currency=AUD&symbol=A$
   ```
2. **User clicks** -> PayPage finds link by `a8x7s3k2j9` (uniqueId)
3. **NEW invoice created** -> unique subaddress per visitor
4. **Multiple visitors = separate invoices** (no payment collisions)

### Security Notes
- Storage event listener only updates timestamp (no code execution)
- No `dangerouslySetInnerHTML` or unsafe parsing
- clipboard.writeText() only contains URLs (safe strings)
- Standard React cross-tab sync pattern

---

### Backup 3: payment-links-fix-clipboard-20260416-212055.tar.gz

### Clipboard Fix
- Fixed COPY button that was showing "Clipboard not available" error
- Added `navigator.clipboard.writeText()` as primary method (HTTPS)
- Added `document.execCommand('copy')` as fallback (HTTP/non-secure contexts)
- Now copies the FULL permanent URL including all params

### Copy Behavior
When user clicks COPY button, it copies:
```
https://moneroflow.com/pay/a8x7s3k2j9/0.1/cake-payment?currency=AUD&symbol=A$
```

---

## Backend Access Log Refresh

### Backup: mf-backend-access-log-refresh-20260417-133934.tar.gz

### Backend Access Log Debug and Port Cleanup
- Resolved port conflict blocking backend (port 4000)
- Restarted PM2 with moneroflow-backend using index-final.js
- Logs now recording correctly to access.log

### Files Changed
- mf-backend/index-final.js - Restarted and debugged

---

## General Restore Instructions

```bash
# Navigate to project root
cd ~/testing/xmr-pay-hub-on-akash

# Extract desired backup (replace with actual filename)
tar -xzf backups/[backup-filename].tar.gz -C /

# Rebuild Docker image
docker build -t xmr-pay-hub:latest .

# Stop old container (if running)
docker stop test-app
docker rm test-app

# Run new container
docker run -d --name test-app -p 8090:80 xmr-pay-hub:latest
```

### Quick Restore (Replace timestamp with actual backup)

```bash
cd ~/testing/xmr-pay-hub-on-akash && \
tar -xzf backups/[backup-filename].tar.gz -C / && \
docker build -t xmr-pay-hub:latest . && \
docker stop test-app && docker rm test-app && \
docker run -d --name test-app -p 8090:80 xmr-pay-hub:latest
```

### Backend-specific Restore (if backup includes mf-backend/)

```bash
# Extract backend backup
cd /home/node/.openclaw/workspace/mf-backend
tar -xzf ~/testing/xmr-pay-hub-on-akash/backups/[backup-filename].tar.gz -C /

# Restart PM2
pm2 restart moneroflow-backend

# Verify backend is running
curl http://localhost:4000/api/mf/analytics/overview
```

---

## Important Notes

- Auto-sweep functionality preserved in all backups (untouched)
- Payment links now work for multi-tenant/shared installations
- Invoices page auto-refreshes - no manual browser refresh needed
- Each backup contains all modified files for that fix
- Referral links are now shareable with full URLs containing domain and ref code
- Referral telemetry syncs automatically while user is authenticated (privacy-focused)
