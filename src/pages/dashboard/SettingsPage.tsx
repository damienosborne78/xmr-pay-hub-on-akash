import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { FadeIn } from '@/components/FadeIn';
import { Copy, Check, Eye, EyeOff, Zap, Shield, ShieldCheck, Lock, Upload, Download } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { exportEncryptedBackup, importEncryptedBackup } from '@/lib/crypto-store';

export default function SettingsPage() {
  const merchant = useStore(s => s.merchant);
  const updateMerchant = useStore(s => s.updateMerchant);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const copyKey = () => {
    navigator.clipboard.writeText(merchant.apiKey);
    setCopied(true);
    toast.success('API key copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportBackup = async () => {
    if (!merchant.privacyPassphrase) { toast.error('Set a passphrase first'); return; }
    try {
      const data = JSON.stringify({ merchant, timestamp: new Date().toISOString() });
      const blob = await exportEncryptedBackup(data, merchant.privacyPassphrase);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `moneroflow-backup-${Date.now()}.json.aes`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Encrypted backup downloaded!');
    } catch { toast.error('Backup export failed'); }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !merchant.privacyPassphrase) { toast.error('Select a file and ensure passphrase is set'); return; }
    setRestoring(true);
    try {
      const json = await importEncryptedBackup(file, merchant.privacyPassphrase);
      const parsed = JSON.parse(json);
      if (parsed.merchant) {
        updateMerchant(parsed.merchant);
        toast.success('Backup restored successfully!');
      }
    } catch { toast.error('Restore failed — wrong passphrase or corrupted file'); }
    setRestoring(false);
  };

  const isPro = merchant.plan === 'pro';

  return (
    <div className="space-y-6 max-w-2xl">
      <FadeIn>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your merchant account</p>
      </FadeIn>

      {/* Privacy Mode — Pro Only */}
      <FadeIn delay={0.03}>
        <div className={`p-6 rounded-xl border space-y-4 ${isPro ? 'bg-card border-success/20' : 'bg-card border-border opacity-60'}`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-success" />
            <h2 className="text-lg font-semibold text-foreground">Complete Privacy Mode</h2>
            {!isPro && <Badge variant="outline" className="text-primary border-primary/30 text-xs">Pro Only</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">Store all data in encrypted browser storage (IndexedDB + AES-GCM). Zero server-side data.</p>
          {isPro ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable Privacy Mode</p>
                  <p className="text-xs text-muted-foreground">All data stored locally, encrypted with your passphrase</p>
                </div>
                <Switch checked={merchant.privacyModeEnabled} onCheckedChange={v => updateMerchant({ privacyModeEnabled: v })} />
              </div>
              {merchant.privacyModeEnabled && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="space-y-2">
                    <Label className="text-foreground">Encryption Passphrase</Label>
                    <Input type="password" value={merchant.privacyPassphrase} onChange={e => updateMerchant({ privacyPassphrase: e.target.value })} className="bg-background border-border font-mono text-sm" placeholder="Choose a strong passphrase" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Privacy Backup Email</Label>
                    <Input type="email" value={merchant.privacyBackupEmail} onChange={e => updateMerchant({ privacyBackupEmail: e.target.value })} className="bg-background border-border text-sm" placeholder="backup@yourmail.com" />
                    <p className="text-xs text-muted-foreground">Encrypted backups will be emailed here every 24h.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportBackup} className="border-border hover:border-success/50 text-success">
                      <Download className="w-4 h-4 mr-1" /> Export Backup (.json.aes)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={restoring} className="border-border hover:border-primary/50">
                      <Upload className="w-4 h-4 mr-1" /> Restore from Backup
                    </Button>
                    <input ref={fileRef} type="file" accept=".aes" className="hidden" onChange={handleRestoreBackup} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Upgrade to Pro ($29/mo) to unlock Complete Privacy Mode.</p>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Cold Wallet Auto-Sweep</h2>
          </div>
          <p className="text-xs text-muted-foreground">Automatically sweep funds to your cold wallet when balance exceeds threshold. Zero custodial risk.</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Auto-Sweep</p>
              <p className="text-xs text-muted-foreground">Instant sweep upon payment confirmation</p>
            </div>
            <Switch checked={merchant.autoSweepEnabled} onCheckedChange={v => updateMerchant({ autoSweepEnabled: v })} />
          </div>
          {merchant.autoSweepEnabled && (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label className="text-foreground">Cold Wallet Address</Label>
                <Input value={merchant.coldWalletAddress} onChange={e => updateMerchant({ coldWalletAddress: e.target.value })} className="bg-background border-border font-mono text-xs" placeholder="Your XMR cold wallet address" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Sweep Threshold</Label>
                  <span className="text-sm font-mono text-primary">{merchant.autoSweepThreshold} XMR</span>
                </div>
                <Slider value={[merchant.autoSweepThreshold]} onValueChange={v => updateMerchant({ autoSweepThreshold: v[0] })} min={0.01} max={10} step={0.01} className="py-2" />
                <p className="text-xs text-muted-foreground">Sweep when balance exceeds this amount</p>
              </div>
            </div>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Fiat Hedging</h2>
          </div>
          <p className="text-xs text-muted-foreground">Auto-convert a percentage of incoming XMR to stablecoins to protect against price drops.</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Hedge Percentage</Label>
              <span className="text-sm font-mono text-primary">{merchant.fiatHedgePercent}%</span>
            </div>
            <Slider value={[merchant.fiatHedgePercent]} onValueChange={v => updateMerchant({ fiatHedgePercent: v[0] })} min={0} max={100} step={5} className="py-2" />
            <p className="text-xs text-muted-foreground">{merchant.fiatHedgePercent === 0 ? 'No hedging — 100% held in XMR' : `${merchant.fiatHedgePercent}% auto-converted to USDT, ${100 - merchant.fiatHedgePercent}% held in XMR`}</p>
          </div>
        </div>
      </FadeIn>

      {/* Referral Settings */}
      <FadeIn delay={0.09}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Referral Program</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Referrals</p>
              <p className="text-xs text-muted-foreground">Earn XMR commissions by referring merchants</p>
            </div>
            <Switch checked={merchant.referralsEnabled} onCheckedChange={v => updateMerchant({ referralsEnabled: v })} />
          </div>
          {merchant.referralsEnabled && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-foreground">Custom Referral Code</Label>
              <Input value={merchant.referralCode} onChange={e => updateMerchant({ referralCode: e.target.value })} className="bg-background border-border font-mono text-sm" placeholder="your-code" />
              <p className="text-xs text-muted-foreground">Link: https://xmrpay.flow/ref/{merchant.referralCode}</p>
            </div>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Webhook Configuration</h2>
          <div className="space-y-2">
            <Label className="text-foreground">Webhook URL</Label>
            <Input value={merchant.webhookUrl} onChange={e => updateMerchant({ webhookUrl: e.target.value })} className="bg-background border-border font-mono text-sm" placeholder="https://yoursite.com/webhooks/xmr" />
            <p className="text-xs text-muted-foreground">We'll POST payment confirmations to this URL.</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.12}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Settlement</h2>
          <div className="space-y-2">
            <Label className="text-foreground">Settlement Address</Label>
            <Input value={merchant.settlementAddress} onChange={e => updateMerchant({ settlementAddress: e.target.value })} className="bg-background border-border font-mono text-xs" placeholder="Your XMR wallet address for settlement" />
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
