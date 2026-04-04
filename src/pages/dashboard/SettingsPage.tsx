import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/FadeIn';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const merchant = useStore(s => s.merchant);
  const updateMerchant = useStore(s => s.updateMerchant);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(merchant.apiKey);
    setCopied(true);
    toast.success('API key copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <FadeIn>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your merchant account</p>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Webhook Configuration</h2>
          <div className="space-y-2">
            <Label className="text-foreground">Webhook URL</Label>
            <Input value={merchant.webhookUrl} onChange={e => updateMerchant({ webhookUrl: e.target.value })} className="bg-background border-border font-mono text-sm" placeholder="https://yoursite.com/webhooks/xmr" />
            <p className="text-xs text-muted-foreground">We'll POST payment confirmations to this URL.</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Settlement</h2>
          <div className="space-y-2">
            <Label className="text-foreground">Cold Wallet Address</Label>
            <Input value={merchant.settlementAddress} onChange={e => updateMerchant({ settlementAddress: e.target.value })} className="bg-background border-border font-mono text-xs" placeholder="Your XMR wallet address for auto-settlement" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium text-foreground">Hybrid Custody Mode</p>
              <p className="text-xs text-muted-foreground">Enable self-sovereign mode — your keys, your coins</p>
            </div>
            <Switch checked={merchant.custodyMode === 'self-sovereign'} onCheckedChange={(v) => updateMerchant({ custodyMode: v ? 'self-sovereign' : 'managed' })} />
          </div>
          <Badge variant="outline" className={merchant.custodyMode === 'self-sovereign' ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground'}>
            {merchant.custodyMode === 'self-sovereign' ? '🔐 Self-Sovereign' : '☁️ Managed'}
          </Badge>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">API Key</h2>
          <div className="flex items-center gap-2">
            <Input value={showKey ? merchant.apiKey : '•'.repeat(merchant.apiKey.length)} readOnly className="bg-background border-border font-mono text-sm flex-1" />
            <Button variant="outline" size="icon" onClick={() => setShowKey(v => !v)} className="border-border hover:border-primary/50 shrink-0">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={copyKey} className="border-border hover:border-primary/50 shrink-0">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Plan</h2>
              <p className="text-sm text-muted-foreground">Current: <span className="capitalize font-medium text-foreground">{merchant.plan}</span></p>
            </div>
            {merchant.plan === 'free' && (
              <Button className="bg-gradient-orange hover:opacity-90" onClick={() => { updateMerchant({ plan: 'pro' }); toast.success('Upgraded to Pro!'); }}>
                Upgrade to Pro — $29/mo
              </Button>
            )}
            {merchant.plan === 'pro' && (
              <Badge className="bg-primary/10 text-primary border-primary/20">Pro Plan Active</Badge>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
