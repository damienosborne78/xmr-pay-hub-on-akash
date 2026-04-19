# Sweep Balance Check Improvements

## Summary

The sweep process has been significantly improved to use **real on-chain wallet balance checks** instead of relying on stored invoice totals. This prevents failed sweeps by ensuring the wallet actually has sufficient funds before attempting to send.

---

## What Changed

### Before (Problem)
- Used cumulative invoice totals to determine available funds
- Could fail if wallet balance didn't match invoice records
- No visibility into what was happening during sweep process

### After (Solution)
- ✅ **Checks real on-chain wallet balance first** using `checkWalletBalance()`
- ✅ **Sweeps entire unlocked balance** (minus estimated fees)
- ✅ **Real-time progress messages** in flashing banner at every step
- ✅ **No more failed sweeps** - verifies balance before sending

---

## New Sweep Process Flow

```
1. Check if auto-sweep enabled and threshold met
   ↓
2. Check REAL on-chain wallet balance
   Banner shows: "Checking wallet balance..."
   ↓
3. Verify sufficient unlocked balance exists
   "Loading wallet engine..."
   "Connecting to node..."
   "Opening wallet..."
   "Syncing recent blocks... xx%"
   ↓
4. Estimate fees (0.2% of balance, min 0.0001 XMR)
   Actual fee calculated by Monero wallet during tx construction
   ↓
5. Sweep ENTIRE unlocked balance (minus fees)
   Banner shows: "Constructing transaction..."
   Banner shows: "Signing and broadcasting..."
   ↓
6. Record sweep in payment history
   Banner shows: "Transaction broadcast!"
   ↓
7. Complete - switch to "Cold Storage Sweep Complete" (solid green)
```

---

## Code Changes

### 1. Added Balance Check

```typescript
// Check real on-chain wallet balance first
const { checkWalletBalance } = await import('./wallet-send');

const balanceResult = await checkWalletBalance(
  merchant.viewOnlySeedPhrase,
  nodeUrl,
  (progress) => {
    // Update banner with progress
    get().updateMerchant({ activeSweepMessage: progress.message });
  },
);
```

### 2. Sweep Entire Balance (Minus Fees)

```typescript
const realUnlockedBalance = balanceResult.unlockedBalance;

// Estimate fee (0.2% of balance, min 0.0001 XMR)
const estimatedFee = Math.max(0.0001, realUnlockedBalance * 0.002);
const amountToSweep = Math.max(0, realUnlockedBalance - estimatedFee);

// Sweep the entire amount
const sendResult = await sendViaDaemonProxy({
  recipientAddress: merchant.coldWalletAddress,
  amountXmr: amountToSweep, // Send MAX available
  priority: 1,
});
```

### 3. Real-Time Progress Messages

Banner shows step-by-step progress during sweep:

| Step | Message |
|------|---------|
| Balance check start | "Checking wallet balance..." |
| Loading engine | "Loading wallet engine..." |
| Connecting | "Connecting to node..." |
| Opening wallet | "Opening wallet..." |
| Syncing (0-100%) | "Syncing blocks... 45%" |
| Constructing tx | "Constructing transaction..." |
| Signing | "Signing and broadcasting..." |
| Complete | "Transaction broadcast!" |

### 4. New Merchant Field

Added `activeSweepMessage: string` to store current sweep step for banner display.

---

## Banner Behavior

### Sweep In Progress

Shows **yellow/green flashing banner** with **real-time progress messages**:

```
⚡ Checking wallet balance...
⚡ Syncing blocks... 67%
⚡ Constructing transaction...
⚅ Signing and broadcasting...
```

### Sweep Complete

Switches to **solid green banner** for 5 seconds:

```
⚅ Cold Storage Sweep Complete
```

---

## Error Handling

### Insufficient Balance

If wallet doesn't have enough funds:
```
Banner: ❌ Gone
Error: "Insufficient unlocked balance in wallet: 0.023456 XMR"
```

### Balance Too Low After Fee

If fee would consume entire balance:
```
Banner: ❌ Gone
Error: "Balance too low after estimated fee. Unlocked: 0.000234 XMR, Est. fee: 0.000100 XMR"
```

### Transaction Failed

If send operation fails:
```
Banner: ❌ Gone
Error: "Transaction failed: [specific error from wallet]"
```

---

## Testing

### Test 1: Successful Full Sweep

1. Enable auto-sweep with threshold: 0.01 XMR
2. Receive enough payments to exceed threshold
3. Click "Sweep Now" or wait for background checker
4. **Watch banner show progress:**
   - "Checking wallet balance..."
   - "Syncing blocks... 45%"
   - "Constructing transaction..."
   - "Signing and broadcasting..."
5. **Banner shows:** "Transaction broadcast!" (still flashing)
6. **Banner changes to:** "Cold Storage Sweep Complete" (solid green, 5s)
7. **Check Payments tab:** New sweep entry with pink highlight
8. **Check Settings:** "Available" drops to ~0, "Swept" increases

### Test 2: Insufficient Funds

1. Set threshold: 0.5 XMR
2. Only have 0.02 XMR in wallet
3. Click "Sweep Now"
4. **Expected result:** Error message "Insufficient unlocked balance"
5. Banner disappears normally after 10s

### Test 3: Very Low Balance

1. Have exactly 0.00015 XMR in wallet
2. Sweep threshold met
3. Click "Sweep Now"
4. **Expected result:** Error "Balance too low after estimated fee"
5. Banner disappears normally

---

## Key Benefits

| Benefit | Before | After |
|---------|--------|-------|
| Reliability | Could fail if balance didn't match records | ✅ Always checks real balance first |
| User Visibility | "Sweeping..." only | ✅ Show every step with progress |
| Amount Swept | Fixed threshold amount | ✅ Entire balance minus fees |
| Error Messages | Generic errors | ✅ Specific balance/fee errors |
| Trust | Blind hope | ✅ On-chain verification |

---

## Build Status

✅ Build completed: Apr 16 15:08
✅ No TypeScript errors
✅ All files compiled

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/store.ts` | Uses `checkWalletBalance()`, sweeps full balance, tracks progress |
| `src/lib/mock-data.ts` | Added `activeSweepMessage: string` field |
| `src/components/DashboardLayout.tsx` | Displays real-time progress in banner |

---

## Edge Cases Handled

✅ Insufficient unlocked balance → Error with actual balance
✅ Balance too low after fees → Error with balance + fee amounts
✅ Network timeout → Caught, banner resets, error returned
✅ wallet-send.js loading → Shows "Loading wallet engine..."
✅ Node connection issues → Shows "Connecting to node..."
✅ Block syncing delays → Shows "Syncing blocks... xx%"

---

## Next Steps (Optional Future Enhancements)

- [ ] Add option to leave small reserve amount in wallet
- [ ] Add more detailed fee estimation options
- [ ] Add wallet balance display in Settings page
- [ ] Add sweep history with individual TX details
- [ ] Add pause/resume sweep capability
