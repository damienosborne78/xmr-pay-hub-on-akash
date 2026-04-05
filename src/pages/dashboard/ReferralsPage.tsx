import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/FadeIn';
import { Copy, Check, Users, TrendingUp, Coins, Gift } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatXMR, formatUSD, usdToXmr } from '@/lib/mock-data';
import { QRCodeSVG } from 'qrcode.react';

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
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const refCode = merchant.referralCode || merchant.id.replace('merch_', '');
  const refLink = `https://xmrpay.flow/ref/${refCode}`;

  const totalReferred = referrals.length;
  const monthlyEarnings = referrals.reduce((sum, r) => sum + (r.monthlyCommission || 0), 0);
  const lifetimeEarnings = referralPayouts.reduce((sum, p) => sum + p.xmrAmount, 0);

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    toast.success('Referral link copied! 🎉');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" /> Referral Program
          </h1>
          <p className="text-muted-foreground text-sm">Earn XMR by referring merchants — multi-level commissions, forever.</p>
        </div>
      </FadeIn>

      {/* Refer & Earn Banner */}
      <FadeIn delay={0.03}>
        <div className="p-5 rounded-xl bg-gradient-orange text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">Refer & Earn XMR 🚀</p>
              <p className="text-sm opacity-90">Refer 5 merchants → earn ~$150+/month in XMR</p>
            </div>
            <Coins className="w-10 h-10 opacity-50" />
          </div>
        </div>
      </FadeIn>

      {/* Stats Cards */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><Users className="w-4 h-4" /> Total Referred</div>
            <p className="text-2xl font-bold text-foreground">{totalReferred}</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><TrendingUp className="w-4 h-4" /> Monthly Earnings</div>
            <p className="text-2xl font-bold text-primary">{formatXMR(usdToXmr(monthlyEarnings))}</p>
            <p className="text-xs text-muted-foreground">{formatUSD(monthlyEarnings)}</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><Coins className="w-4 h-4" /> Lifetime Earnings</div>
            <p className="text-2xl font-bold text-foreground">{formatXMR(lifetimeEarnings)}</p>
          </div>
        </div>
      </FadeIn>

      {/* Referral Link + QR */}
      <FadeIn delay={0.08}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Referral Link</h2>
          <div className="flex items-center gap-2">
            <Input value={refLink} readOnly className="bg-background border-border font-mono text-sm flex-1" />
            <Button variant="outline" size="icon" onClick={copyLink} className="border-border hover:border-primary/50 shrink-0">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowQR(v => !v)} className="text-muted-foreground text-xs">
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </Button>
          {showQR && (
            <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
              <QRCodeSVG value={refLink} size={160} />
            </div>
          )}
        </div>
      </FadeIn>

      {/* Commission Structure */}
      <FadeIn delay={0.1}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Commission Structure</h2>
          <p className="text-xs text-muted-foreground">Multi-level commissions on every referred merchant's subscription revenue — forever.</p>
          <div className="space-y-2">
            {COMMISSION_TIERS.map(t => (
              <div key={t.level} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">L{t.level}</Badge>
                  <span className="text-sm text-foreground">{t.label}</span>
                </div>
                <span className="font-bold text-primary">{t.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Downline */}
      <FadeIn delay={0.12}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Downline</h2>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet. Share your link to start earning!</p>
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
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
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
    </div>
  );
}
