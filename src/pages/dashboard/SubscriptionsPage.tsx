import { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatUSD, formatXMR, PRO_MONTHLY_XMR, CREATOR_TREASURY_ADDRESS } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FadeIn } from '@/components/FadeIn';
import { Plus, RefreshCw, Pause, Play, X, Crown, Zap, Shield, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionsPage() {
  const merchant = useStore(s => s.merchant);
  const subscriptions = useStore(s => s.subscriptions);
  const createSubscription = useStore(s => s.createSubscription);
  const toggleSubscription = useStore(s => s.toggleSubscription);
  const cancelSubscription = useStore(s => s.cancelSubscription);
  const activateProSubscription = useStore(s => s.activateProSubscription);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState<'weekly' | 'monthly'>('monthly');
  const [showProSignup, setShowProSignup] = useState(false);
  const [proTxid, setProTxid] = useState('');

  const isPro = merchant.proStatus === 'pro' || merchant.proStatus === 'pro_referral' || merchant.proUnlockedViaReferrals;

  const handleCreate = () => {
    if (!email || !desc || !amount || isNaN(Number(amount))) return;
    const sub = createSubscription({ customerEmail: email, description: desc, fiatAmount: Number(amount), fiatCurrency: 'USD', interval });
    toast.success(`Subscription ${sub.id} created!`);
    setOpen(false);
    setEmail(''); setDesc(''); setAmount('');
  };

  const handleProActivate = () => {
    if (!proTxid || proTxid.length < 10) {
      toast.error('Enter a valid transaction hash');
      return;
    }
    activateProSubscription(proTxid);
    setShowProSignup(false);
    setProTxid('');
    toast.success('Pro subscription activated!');
  };

  const statusColors: Record<string, string> = {
    active: 'bg-success/10 text-success border-success/20',
    paused: 'bg-warning/10 text-warning border-warning/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const proFeatures = [
    'Privacy Mode (encrypted backups)',
    'Multiple POS Users & Roles',
    'Priority support & early features',
    'White-label branding',
  ];

  return (
    <div className="space-y-6">
      {/* ── Pro Plan Status ── */}
      <FadeIn>
        <div className={`p-5 rounded-xl border ${isPro ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isPro ? 'bg-primary/10' : 'bg-muted'}`}>
                <Crown className={`w-5 h-5 ${isPro ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Pro Plan</h2>
                  <Badge variant="outline" className={isPro ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground'}>
                    {isPro ? (merchant.proUnlockedViaReferrals ? 'Referral Pro' : merchant.proStatus === 'pro_referral' ? 'Lifetime' : 'Active') : 'Free Plan'}
                  </Badge>
                </div>
                {isPro && merchant.proExpiresAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Expires: {new Date(merchant.proExpiresAt).toLocaleDateString()}
                  </p>
                )}
                {isPro && merchant.proUnlockedViaReferrals && (
                  <p className="text-xs text-success mt-0.5">Unlocked via referrals — free forever!</p>
                )}
                {!isPro && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upgrade for {formatXMR(PRO_MONTHLY_XMR)}/month to unlock all features
                  </p>
                )}
              </div>
            </div>
            {!isPro && (
              <Dialog open={showProSignup} onOpenChange={setShowProSignup}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-orange hover:opacity-90">
                    <Zap className="w-4 h-4 mr-2" /> Upgrade to Pro
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center gap-2">
                      <Crown className="w-5 h-5 text-primary" /> Upgrade to Pro
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                      {proFeatures.map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="w-4 h-4 text-success shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Send <strong className="text-primary">{formatXMR(PRO_MONTHLY_XMR)}</strong>/month to:</p>
                      <p className="font-mono text-[9px] text-foreground break-all select-all bg-background rounded p-2 border border-border">
                        {CREATOR_TREASURY_ADDRESS}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">Transaction Hash (after sending)</Label>
                      <Input
                        value={proTxid}
                        onChange={e => setProTxid(e.target.value)}
                        placeholder="Paste your TX hash here..."
                        className="bg-background border-border font-mono text-xs"
                      />
                    </div>

                    <Button onClick={handleProActivate} className="w-full bg-gradient-orange hover:opacity-90">
                      <Shield className="w-4 h-4 mr-2" /> Activate Pro
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {!isPro && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-border/50">
              {proFeatures.map(f => (
                <div key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="w-3 h-3 text-primary shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {/* ── Recurring Subscriptions ── */}
      <FadeIn delay={0.05}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
            <p className="text-muted-foreground text-sm">Recurring XMR payments — auto-invoiced on schedule</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-orange hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> New Subscription</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="text-foreground">Create Subscription</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Customer Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Description</Label>
                  <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Pro Plan Monthly" className="bg-background border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-foreground">Amount (USD)</Label>
                    <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="29.00" className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Interval</Label>
                    <Select value={interval} onValueChange={v => setInterval(v as 'weekly' | 'monthly')}>
                      <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full bg-gradient-orange hover:opacity-90">Create Subscription</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {subscriptions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No subscriptions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">ID</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Customer</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Plan</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Amount</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Interval</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Invoices</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Next Billing</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(sub => (
                    <tr key={sub.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{sub.id}</td>
                      <td className="py-3 px-4 text-foreground">{sub.customerEmail}</td>
                      <td className="py-3 px-4 text-foreground">{sub.description}</td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">{formatUSD(sub.fiatAmount)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="text-muted-foreground">
                          <RefreshCw className="w-3 h-3 mr-1" />{sub.interval}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{sub.invoiceCount}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(sub.nextBillingDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className={statusColors[sub.status]}>{sub.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {sub.status !== 'cancelled' && (
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => { toggleSubscription(sub.id); toast.info(`Subscription ${sub.status === 'active' ? 'paused' : 'resumed'}`); }}>
                              {sub.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          {sub.status !== 'cancelled' && (
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive"
                              onClick={() => { cancelSubscription(sub.id); toast.info('Subscription cancelled'); }}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
