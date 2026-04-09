import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/FadeIn';
import { Copy, Check, Users, TrendingUp, Coins, Gift, Zap, Crown, Shield, ArrowRight, QrCode, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatXMR, formatUSD, usdToXmr, PRO_MONTHLY_XMR, PRO_REFERRAL_UNLOCK_COUNT, CREATOR_TREASURY_ADDRESS, REFERRAL_ECOSYSTEM_PERCENT } from '@/lib/mock-data';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const COMMISSION_TIERS = [
  { level: 1, label: 'Direct Referral', percent: 25 },
  { level: 2, label: 'Level 2', percent: 10 },
  { level: 3, label: 'Level 3', percent: 5 },
  { level: 4, label: 'Level 4+', percent: 2 },
];

export default function ReferralsPage() {
  const merchant = useStore(s => s.merchant);
  const referrals = useStore(s => s.referrals);
  const referralPayouts = useStore(s => s.referralPayouts);
  const activateProSubscription = useStore(s => s.activateProSubscription);
  const checkReferralProUnlock = useStore(s => s.checkReferralProUnlock);
  const [copied, setCopied] = useState(false);
  const [copiedTreasury, setCopiedTreasury] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showProActivation, setShowProActivation] = useState(false);
  const [proTxid, setProTxid] = useState('');

  const fingerprint = merchant.referralWalletFingerprint || merchant.referralCode || 'LOADING';
  const refLink = `https://moneroflow.com/ref/${fingerprint}`;
  const directReferrals = referrals.filter(r => r.level === 1).length;
  const totalReferred = referrals.length;
  const monthlyEarnings = referrals.reduce((sum, r) => sum + (r.monthlyCommission || 0), 0);
  const lifetimeEarnings = referralPayouts.reduce((sum, p) => sum + p.xmrAmount, 0);
  const progressToFreePro = Math.min(directReferrals / PRO_REFERRAL_UNLOCK_COUNT * 100, 100);
  const isPro = merchant.proStatus === 'pro' || merchant.proStatus === 'pro_referral';
  const isProViaReferral = merchant.proStatus === 'pro_referral';

  // Payment ID for pro subscription = fingerprint padded to 16 hex chars
  const proPaymentId = fingerprint.padEnd(16, '0').slice(0, 16);

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    toast.success('Referral link copied! 🎉');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyTreasury = () => {
    navigator.clipboard.writeText(CREATOR_TREASURY_ADDRESS);
    setCopiedTreasury(true);
    toast.success('Treasury address copied!');
    setTimeout(() => setCopiedTreasury(false), 2000);
  };

  const handleProActivation = () => {
    if (!proTxid || proTxid.length < 10) {
      toast.error('Please enter a valid transaction hash');
      return;
    }
    activateProSubscription(proTxid);
    setShowProActivation(false);
    setProTxid('');
    toast.success('🎉 Pro activated! Welcome to the elite.');
  };

  // Monero URI for pro payment
  const proPaymentUri = `monero:${CREATOR_TREASURY_ADDRESS}?tx_amount=${PRO_MONTHLY_XMR.toFixed(6)}&tx_payment_id=${proPaymentId}&tx_description=MoneroFlow%20Pro%20Subscription`;

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" /> Referral Program
            </h1>
            <p className="text-muted-foreground text-sm">Earn XMR by referring merchants — decentralized, on-chain, forever.</p>
          </div>
          {isPro ? (
            <Badge className="bg-gradient-orange text-primary-foreground border-0 gap-1">
              <Crown className="w-3.5 h-3.5" /> {isProViaReferral ? 'Pro (Earned)' : 'Pro Active'}
            </Badge>
          ) : (
            <Button size="sm" className="bg-gradient-orange hover:opacity-90" onClick={() => setShowProActivation(true)}>
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Upgrade to Pro
            </Button>
          )}
        </div>
      </FadeIn>

      {/* Earn-to-Unlock Progress */}
      {!isPro && (
        <FadeIn delay={0.02}>
          <div className="p-5 rounded-xl bg-card border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Earn Free Pro</span>
              </div>
              <span className="text-sm text-muted-foreground">{directReferrals}/{PRO_REFERRAL_UNLOCK_COUNT} merchants</span>
            </div>
            <div className="w-full h-3 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-orange rounded-full transition-all duration-500"
                style={{ width: `${progressToFreePro}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Refer {PRO_REFERRAL_UNLOCK_COUNT - directReferrals} more merchants to unlock Pro forever — no payment needed!
            </p>
          </div>
        </FadeIn>
      )}

      {/* Revenue Split Banner */}
      <FadeIn delay={0.03}>
        <div className="p-5 rounded-xl bg-gradient-orange text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">On-Chain Referral Rewards 🚀</p>
              <p className="text-sm opacity-90">{REFERRAL_ECOSYSTEM_PERCENT}% of every Pro subscription goes back to the referral network</p>
              <p className="text-xs opacity-70 mt-1">Multi-level commissions paid in XMR · No accounts · No KYC</p>
            </div>
            <Coins className="w-10 h-10 opacity-50" />
          </div>
        </div>
      </FadeIn>

      {/* Stats Cards */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><Users className="w-4 h-4" /> Direct Referrals</div>
            <p className="text-2xl font-bold text-foreground">{directReferrals}</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><Users className="w-4 h-4" /> Total Network</div>
            <p className="text-2xl font-bold text-foreground">{totalReferred}</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><TrendingUp className="w-4 h-4" /> Monthly Earnings</div>
            <p className="text-2xl font-bold text-primary">{formatXMR(usdToXmr(monthlyEarnings))}</p>
            <p className="text-xs text-muted-foreground">{formatUSD(monthlyEarnings)}</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><Coins className="w-4 h-4" /> Lifetime Earned</div>
            <p className="text-2xl font-bold text-foreground">{formatXMR(lifetimeEarnings)}</p>
          </div>
        </div>
      </FadeIn>

      {/* Your Referral Identity */}
      <FadeIn delay={0.06}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your Referral Identity</h2>
            <Badge variant="outline" className="font-mono text-primary border-primary/20">{fingerprint}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Your referral fingerprint is derived from your wallet — no signup needed. 
            Share your link and earn XMR when referred merchants subscribe to Pro.
          </p>
          <div className="flex items-center gap-2">
            <Input value={refLink} readOnly className="bg-background border-border font-mono text-sm flex-1" />
            <Button variant="outline" size="icon" onClick={copyLink} className="border-border hover:border-primary/50 shrink-0">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowQR(v => !v)} className="text-muted-foreground text-xs">
            <QrCode className="w-3.5 h-3.5 mr-1.5" />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </Button>
          {showQR && (
            <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
              <QRCodeSVG value={refLink} size={160} />
            </div>
          )}
        </div>
      </FadeIn>

      {/* How It Works */}
      <FadeIn delay={0.08}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> How On-Chain Monetization Works
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-background border border-border text-center">
              <Wallet className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">Pay On-Chain</p>
              <p className="text-xs text-muted-foreground">Send {PRO_MONTHLY_XMR} XMR to the treasury with your payment ID. No accounts needed.</p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border text-center">
              <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">Verified On-Chain</p>
              <p className="text-xs text-muted-foreground">The blockchain is the receipt. Your payment ID links the tx to your wallet fingerprint.</p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border text-center">
              <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">{REFERRAL_ECOSYSTEM_PERCENT}% Back</p>
              <p className="text-xs text-muted-foreground">Half of every Pro payment flows to referrers. Or refer {PRO_REFERRAL_UNLOCK_COUNT} → free Pro forever.</p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Commission Structure */}
      <FadeIn delay={0.1}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Commission Structure</h2>
          <p className="text-xs text-muted-foreground">
            {REFERRAL_ECOSYSTEM_PERCENT}% of every Pro subscription ({(PRO_MONTHLY_XMR * REFERRAL_ECOSYSTEM_PERCENT / 100).toFixed(4)} XMR) is distributed across the referral tree:
          </p>
          <div className="space-y-2">
            {COMMISSION_TIERS.map(t => {
              const perSubXmr = PRO_MONTHLY_XMR * (REFERRAL_ECOSYSTEM_PERCENT / 100) * (t.percent / 100);
              return (
                <div key={t.level} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">L{t.level}</Badge>
                    <span className="text-sm text-foreground">{t.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">{t.percent}%</span>
                    <span className="text-xs text-muted-foreground ml-2">({perSubXmr.toFixed(6)} XMR/sub)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FadeIn>

      {/* Downline */}
      <FadeIn delay={0.12}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Network</h2>
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No referrals yet</p>
              <p className="text-xs text-muted-foreground">Share your referral link to start building your network and earning XMR!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs text-muted-foreground">L{r.level}</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.username}</p>
                      <p className="text-xs text-muted-foreground">Joined {new Date(r.joinedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-primary">{formatUSD(r.monthlyCommission)}/mo</p>
                    <p className="text-xs text-muted-foreground">from their revenue</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Payout History */}
      <FadeIn delay={0.15}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Payout History</h2>
          {referralPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet. Payouts are sent directly to your wallet on-chain.</p>
          ) : (
            <div className="space-y-2">
              {referralPayouts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{new Date(p.date).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">{p.referralCount} referrals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-primary">{formatXMR(p.xmrAmount)}</p>
                    <Badge variant="outline" className={p.status === 'paid' ? 'text-success border-success/30' : 'text-warning border-warning/30'}>
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Pro Activation Dialog */}
      <Dialog open={showProActivation} onOpenChange={setShowProActivation}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Crown className="w-5 h-5 text-primary" /> Activate Pro Subscription
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-background border border-border text-center">
              <p className="text-2xl font-bold text-primary mb-1">{PRO_MONTHLY_XMR} XMR<span className="text-sm text-muted-foreground font-normal">/month</span></p>
              <p className="text-xs text-muted-foreground">Or refer {PRO_REFERRAL_UNLOCK_COUNT} merchants for free Pro forever</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">1. Send XMR to this address:</p>
              <div className="p-3 rounded-lg bg-background border border-border">
                <p className="font-mono text-xs text-muted-foreground break-all leading-relaxed">{CREATOR_TREASURY_ADDRESS}</p>
                <Button variant="outline" size="sm" onClick={copyTreasury} className="mt-2 border-border hover:border-primary/50">
                  {copiedTreasury ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
                  {copiedTreasury ? 'Copied' : 'Copy Address'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">2. Include this Payment ID:</p>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="font-mono text-sm text-primary text-center tracking-wider">{proPaymentId}</p>
              </div>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
              <QRCodeSVG value={proPaymentUri} size={180} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">3. Paste your TX hash to activate:</p>
              <Input
                value={proTxid}
                onChange={e => setProTxid(e.target.value)}
                placeholder="Transaction hash (64 hex characters)"
                className="bg-background border-border font-mono text-sm"
              />
            </div>

            <Button
              className="w-full bg-gradient-orange hover:opacity-90"
              onClick={handleProActivation}
              disabled={!proTxid}
            >
              <Zap className="w-4 h-4 mr-2" /> Activate Pro
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {REFERRAL_ECOSYSTEM_PERCENT}% of your payment rewards the referral network that brought you here.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
