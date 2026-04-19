# Cold Wallet Auto-Sweep - Implementation Notes

## Overview

This implementation adds automatic cold wallet sweeping functionality to the XMR Pay Hub. The system accumulates received payments and sweeps funds to a cold wallet when the accumulated balance exceeds a configurable threshold.

## Key Features

### 1. **Cumulative Tracking**
- Tracks total received XMR from all paid invoices (excluding sent transactions)
- Tracks total swept XMR to prevent double-counting
- Displays real-time stats in Settings page

### 2. **Threshold-Based Sweeping**
- User-configurable sweep threshold (0.01 - 10 XMR)
- Only sweeps exactly the threshold amount (not full balance)
- Preserves remaining funds in hot wallet

### 3. **Background Checker**
- Runs every 60 seconds (configurable)
- Automatically executes sweeps when threshold is met
- Non-blocking - doesn't interfere with kiosk operations

### 4. **Visual Feedback**
- Green flashing banner in header when sweep is active
- Shows "Cold Storage Sweep Activated" or "Cold Storage Sweep Complete"
- Auto-hides after completion

### 5. **Manual Trigger**
- "Sweep Now" button in Settings for testing
- Shows real-time cumulative, available, and swept amounts
- Displays success/error messages

## Technical Implementation

### Files Modified

**1. `src/lib/mock-data.ts`**
- Added Merchant interface fields:
  - `cumulativeReceivedXmr: number` - Total received
  - `totalSweptXmr: number` - Total swept to cold wallet
  - `lastSweepDate: string | null` - Last successful sweep timestamp
  - `activeSweepFlag: boolean` - Controls banner visibility

**2. `src/lib/store.ts`**
- Removed per-invoice sweep logic (was broken)
- Added functions:
  - `calculateCumulativeReceived()` - Calculates total received from paid invoices
  - `runSweepCheck()` - Executes sweep if threshold met
  - `resetSweepCounter()` - Resets sweep tracking (for testing)

**3. `src/pages/dashboard/SettingsPage.tsx`**
- Added sweep statistics display (3-column grid)
- Added "Sweep Now" button for manual triggers
- Added sweep result messages (success/error)

**4. `src/components/DashboardLayout.tsx`**
- Added `SweepStatusBanner` component for visual feedback
- Integrated `SweepChecker` component for background checking

**5. `src/components/SweepChecker.tsx`** (NEW)
- Background periodic checker component
- Configurable interval (default 60s)
- Non-blocking execution

## Usage Instructions

### For Users

1. **Enable Auto-Sweep:**
   - Go to Settings → Cold Wallet Auto-Sweep
   - Toggle "Enable Auto-Sweep"
   - Enter your cold wallet address
   - Set sweep threshold (default: 0.5 XMR)

2. **Monitor Accumulation:**
   - View real-time stats in Settings page
   - "Cumulative" = Total received from all paid invoices
   - "Available" = Cumulative - Already swept
   - "Swept" = Total sent to cold wallet

3. **Manual Sweep:**
   - Click "Sweep Now" to trigger immediate sweep
   - Only works if available balance >= threshold
   - Shows success/error feedback

### For Developers

#### Test the Sweep Function

```typescript
// In browser console or test code:
const store = useStore.getState();

// Check current stats
console.log('Cumulative:', store.calculateCumulativeReceived());
console.log('Total swept:', store.merchant.totalSweptXmr);

// Manual sweep
const result = await store.runSweepCheck();
console.log('Result:', result);

// Reset counter (for testing)
store.resetSweepCounter();
```

#### Background Checker Configuration

```tsx
// In DashboardLayout.tsx:
<SweepChecker enabled={true} intervalMs={60000} />
```

- `enabled`: Enable/disable background checking
- `intervalMs`: Check interval in milliseconds (default: 60000 = 1 minute)

## Edge Cases Handled

1. **Insufficient funds:** Returns helpful error with current vs required amounts
2. **No cold wallet address:** Returns error, asks user to set address
3. **Wallet not ready:** Checks for `viewOnlySeedPhrase` before attempting sweep
4. **Sweep already in progress:** Uses `activeSweepFlag` to prevent duplicate sweeps
5. **Network errors:** Catches and logs errors, resets flag
6. **Race conditions:** Initial delay (5s) to avoid conflicts on app load

## JavaScript Style Guide Compliance

All code follows strict JavaScript best practices:
- ✅ `const` and `let` (no `var`)
- ✅ Arrow functions for callbacks
- ✅ Async/await over promises
- ✅ Proper error handling with try/catch
- ✅ Descriptive function and variable names (camelCase)
- ✅ Template literals for strings
- ✅ Trailing commas in multi-line structures
- ✅ Optional chaining (`?.`) and nullish coalescing (`??`)

## Future Enhancements

Consider adding:
- Sweep history log with TX hashes
- Configurable sweep intervals
- Multiple cold wallet addresses (round-robin)
- Sweep fee estimation
- Email notifications on sweep completion

## Testing Checklist

- [ ] Cumulative calculation correct after multiple payments
- [ ] Sweep triggers exactly at threshold
- [ ] Manual "Sweep Now" works when threshold met
- [ ] Manual sweep blocked when below threshold
- [ ] Background checker runs periodically
- [ ] Banner shows during active sweep
- [ ] Banner auto-hides after completion
- [ ] Counter tracks swept amounts correctly
- [ ] Reset counter works
- [ ] Error messages are helpful
- [ ] No duplicate sweeps in quick succession
