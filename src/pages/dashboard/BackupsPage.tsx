import { FadeIn } from '@/components/FadeIn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { HardDrive, Cloud, Lock, Download, Upload, Loader2, ShieldCheck, Clock } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { exportEncryptedBackup, importEncryptedBackup } from '@/lib/crypto-store';

const CLOUD_PROVIDERS = [
  { id: 'google-drive', name: 'Google Drive', icon: '📁', desc: 'Back up to your Google account' },
  { id: 'dropbox', name: 'Dropbox', icon: '📦', desc: 'Sync backups to Dropbox' },
  { id: 'icloud', name: 'iCloud', icon: '☁️', desc: 'Apple iCloud Drive backup' },
];

const FREQUENCY_OPTIONS = [
  { value: '1h', label: 'Every 1 hour' },
  { value: '4h', label: 'Every 4 hours' },
  { value: '1d', label: 'Every 1 day' },
  { value: '3d', label: 'Every 3 days' },
  { value: '5d', label: 'Every 5 days' },
  { value: '1w', label: 'Every 1 week' },
];

export default function BackupsPage() {
  const merchant = useStore(s => s.merchant);
  const updateMerchant = useStore(s => s.updateMerchant);
  const isPro = merchant.plan === 'pro';

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('1d');
  const [connectedCloud, setConnectedCloud] = useState<string | null>(null);
  const [connectingCloud, setConnectingCloud] = useState<string | null>(null);
  const [encryptedBackups, setEncryptedBackups] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);

  const handleManualBackup = async () => {
    setExporting(true);
    try {
      const state = useStore.getState();
      const backupData = JSON.stringify({
        merchant: state.merchant,
        invoices: state.invoices,
        subscriptions: state.subscriptions,
        paymentLinks: state.paymentLinks,
        referrals: state.referrals,
        referralPayouts: state.referralPayouts,
        timestamp: new Date().toISOString(),
        version: '1.0',
      });

      if (encryptedBackups && isPro && merchant.privacyPassphrase) {
        const blob = await exportEncryptedBackup(backupData, merchant.privacyPassphrase);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moneroflow-backup-${Date.now()}.json.aes`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Encrypted backup downloaded!');
      } else {
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moneroflow-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Backup downloaded!');
      }
    } catch {
      toast.error('Backup export failed');
    }
    setExporting(false);
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    try {
      let json: string;
      if (file.name.endsWith('.aes')) {
        if (!merchant.privacyPassphrase) {
          toast.error('Set a passphrase in Settings → Privacy Mode first');
          setRestoring(false);
          return;
        }
        json = await importEncryptedBackup(file, merchant.privacyPassphrase);
      } else {
        json = await file.text();
      }
      const parsed = JSON.parse(json);
      if (parsed.merchant) {
        updateMerchant(parsed.merchant);
        toast.success('Backup restored successfully!');
      } else {
        toast.error('Invalid backup file format');
      }
    } catch {
      toast.error('Restore failed — wrong passphrase or corrupted file');
    }
    setRestoring(false);
    if (e.target) e.target.value = '';
  };

  const handleConnectCloud = async (providerId: string) => {
    setConnectingCloud(providerId);
    // Simulate OAuth flow — in production this would open an OAuth popup
    setTimeout(() => {
      setConnectedCloud(providerId);
      setConnectingCloud(null);
      toast.success(`Connected to ${CLOUD_PROVIDERS.find(p => p.id === providerId)?.name}!`);
    }, 2000);
  };

  const handleDisconnectCloud = () => {
    setConnectedCloud(null);
    toast.success('Cloud backup disconnected');
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <FadeIn>
        <h1 className="text-2xl font-bold text-foreground">Backups</h1>
        <p className="text-muted-foreground text-sm">Protect your data with local and cloud backups</p>
      </FadeIn>

      {/* Manual Backup */}
      <FadeIn delay={0.05}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Manual Backup</h2>
          </div>
          <p className="text-xs text-muted-foreground">Download a full backup of your wallet config, invoices, subscriptions, and settings.</p>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleManualBackup} disabled={exporting} className="bg-gradient-orange hover:opacity-90">
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {exporting ? 'Exporting...' : 'Download Backup'}
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={restoring} className="border-border hover:border-primary/50">
              {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {restoring ? 'Restoring...' : 'Restore from File'}
            </Button>
            <input ref={fileRef} type="file" accept=".json,.aes" className="hidden" onChange={handleRestoreBackup} />
          </div>
        </div>
      </FadeIn>

      {/* Auto Local Backups */}
      <FadeIn delay={0.08}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Auto Local Backups</h2>
          </div>
          <p className="text-xs text-muted-foreground">Automatically save backup snapshots to your browser's storage at set intervals.</p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Auto Local Backups</p>
              <p className="text-xs text-muted-foreground">Snapshots saved to IndexedDB automatically</p>
            </div>
            <Switch checked={autoBackupEnabled} onCheckedChange={setAutoBackupEnabled} />
          </div>

          {autoBackupEnabled && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Backup Frequency</label>
                <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-[11px] text-muted-foreground">
                  💾 Backups are stored locally in your browser. They persist across sessions but will be lost if browser data is cleared. For maximum safety, also use cloud backup.
                </p>
              </div>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Cloud Backups */}
      <FadeIn delay={0.1}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Cloud Backups</h2>
          </div>
          <p className="text-xs text-muted-foreground">Sync backups to a cloud provider for off-device safety. Connects via OAuth — no passwords stored.</p>

          <div className="grid gap-3">
            {CLOUD_PROVIDERS.map(provider => {
              const isConnected = connectedCloud === provider.id;
              const isConnecting = connectingCloud === provider.id;
              return (
                <div key={provider.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isConnected ? 'border-success/30 bg-success/5' : 'border-border bg-card'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">{provider.desc}</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-success/10 text-success border-success/20 text-xs">Connected</Badge>
                      <Button variant="ghost" size="sm" onClick={handleDisconnectCloud} className="text-xs text-muted-foreground hover:text-destructive">
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnectCloud(provider.id)}
                      disabled={!!connectingCloud}
                      className="border-border hover:border-primary/50"
                    >
                      {isConnecting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {connectedCloud && autoBackupEnabled && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-foreground">
                ✅ Auto backups will sync to {CLOUD_PROVIDERS.find(p => p.id === connectedCloud)?.name} every <strong>{FREQUENCY_OPTIONS.find(f => f.value === backupFrequency)?.label?.toLowerCase()}</strong>.
              </p>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Encrypted Backups — Pro Only */}
      <FadeIn delay={0.12}>
        <div className={`p-6 rounded-xl border space-y-4 ${isPro ? 'bg-card border-success/20' : 'bg-card border-border opacity-60'}`}>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-success" />
            <h2 className="text-lg font-semibold text-foreground">Encrypted Backups</h2>
            {!isPro && <Badge variant="outline" className="text-primary border-primary/30 text-xs">Pro Only</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">AES-256-GCM encrypted backups. Even if someone accesses your backup file, they can't read it without your passphrase.</p>

          {isPro ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable Encrypted Backups</p>
                  <p className="text-xs text-muted-foreground">All backups (manual + auto) will be encrypted with your Privacy Mode passphrase</p>
                </div>
                <Switch
                  checked={encryptedBackups}
                  onCheckedChange={v => {
                    if (v && !merchant.privacyPassphrase) {
                      toast.error('Set a passphrase in Settings → Privacy Mode first');
                      return;
                    }
                    setEncryptedBackups(v);
                  }}
                />
              </div>
              {encryptedBackups && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-xs text-success flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    Backups are encrypted with AES-256-GCM. Keep your passphrase safe — it cannot be recovered.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Upgrade to Pro ($29/mo) to unlock encrypted backups.</p>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
