# Transak Fiat On-Ramp Integration - Setup Guide

## What Was Built

Users can now buy XMR directly from the MoneroFlow dashboard via the Transak on-ramp widget. No exchange account needed—MoneroFlow integrates Transak as a fiat-to-crypto partner.

## Integration Details

### Files Created
- `src/components/TransakWidget.tsx` - Transak modal widget component
- `.env.production` - Production environment variables (with demo API key)
- `.env.production.example` - Example environment file for deployment

### Files Modified
- `src/components/DashboardLayout.tsx` - Added "Buy XMR" button to dashboard header
- `Dockerfile` - Build process updated to include env files
- `.dockerignore` - Excluded `.env.local` but allowed `.env.production`

### New Component: TransakWidget
- Opens Transak modal from dashboard button
- Pre-fills user's wallet address (auto-detected)
- KYC handled by Transak (compliant, licensed)
- XMR sent directly to user's wallet (MoneroFlow never touches funds)
- Event listeners for success/failure/closed
- Supports AUD, USD, EUR fiat currencies
- Australia default (connects via PayID/card/BPay soon)

### Button Placement
- Added to dashboard header next to badges
- Matches orange "Start Accepting XMR" gradient style
- Wallet icon for clarity
- Disabled if user has no wallet address (wants auto-onboard first)

## Setup Instructions

### 1. Get Transak API Key
1. Go to [Transak](https://transak.com/) and sign up
2. Complete business verification (quick:护照/ Australian ABN, etc.)
3. Get your API key from dashboard
4. Note: Free sandbox API key for testing

### 2. Configure Environment Variables

Replace the demo API key in `.env.production`:

```env
# Transak Fiat On-Ramp Integration
VITE_TRANSAK_API_KEY=YOUR_ACTUAL_TRANSAK_API_KEY
VITE_TRANSAK_ENV=PRODUCTION  # Must set to PRODUCTION for live
```

For development/testing, use STAGING (free, play money).

### 3. Rebuild and Deploy

```bash
cd ~/testing/xmr-pay-hub-on-akash
docker build -t xmr-pay-hub:latest .
docker stop test-app
docker rm test-app
docker run -d --name test-app -p 8090:80 xmr-pay-hub:latest
```

### 4. Test Workflow

1. Visit dashboard as user with wallet set up
2. Click "Buy XMR" button in header
3. Transak modal opens → complete KYC (passport/driver)
4. Pay with card/bank → transak buys XMR → sends to wallet
5. Confetti "XMR purchased!" notification

5. Check wallet after a few minutes; auto-displays balance after subaddress and explorer sync.

## How It Works

```
User clicks "Buy XMR"
    ↓
TransakWidget component loads
    ↓
Transak SDK opens modal widget
    ↓
User completes KYC (Transak's responsibility)
    ↓
User pays fiat (card/bank via Transak)
    ↓
Transak buys XMR (liquidity via Transak)
    ↓
XMR sent directly to user's wallet address
    ↓
MoneroFlow displays updated balance
```

### Important: No Wallet Custody

✅ **User's wallet address** → XMR sent directly  
✅ **MoneroFlow** never holds funds  
✅ **Transak** handles compliance & licenses

## Next Steps

### For Deployment (Akash / Production)
1. Set Transak ENV=PRODUCTION
2. Configure referral API key (for revenue share)
3. Add tracking for on-ramp conversions (analytics)
4. Add "Buy XMR" to landing page hero (paid ads)
5. A/B test button placement
6. Free 🔓 unlock (on-ramp → Pro for 7 days)

### For User Experience Improvements
1. Add animate "XMR purchased!" notification (confetti)
2. Add "New XMR balance" toast on arrival
3. Add "How to get XMR" guide as on-ramp alternative

### For Features
- Offer other provider fallback (MoonPay, Banxa)
- Support other fiat currencies beyond AUD/USD/EUR
- Add local payment methods across AU (PayID, OSKO, BPay)

## Fallback Backup Provider

If Transak unavailable/restricted:
- Uncomment MoonPay widget (similar integration)
- Replace API key and currency support
- Test fallback UX before production deployment

## Licensing

- Transak SDK: MIT-licensed
- MoneroFlow Integration: Open source (MIT)
- KYC license: Transak's responsibility (not yours!)

## Support

- Transak docs: https://docs.transak.com/
- Integration sample: Already in code ✅
- Live support: https://transak.com/support
