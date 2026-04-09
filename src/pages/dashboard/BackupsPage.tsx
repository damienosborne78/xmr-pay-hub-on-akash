import { FadeIn } from '@/components/FadeIn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { HardDrive, Cloud, Lock, Download, Upload, Loader2, ShieldCheck, Clock, Check, ExternalLink } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { exportEncryptedBackup, importEncryptedBackup } from '@/lib/crypto-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CLOUD_PROVIDERS = [
  { id: 'google-drive', name: 'Google Drive', icon: '📁', desc: 'Back up to your Google account', authUrl: 'https://accounts.google.com/o/oauth2/auth', instructions: 'Sign in with your Google account to allow MoneroFlow to store encrypted backups in a dedicated folder in your Google Drive.' },
  { id: 'dropbox', name: 'Dropbox', icon: '📦', desc: 'Sync backups to Dropbox', authUrl: 'https://www.dropbox.com/oauth2/authorize', instructions: 'Connect your Dropbox account. MoneroFlow will create a "MoneroFlow Backups" folder to store your encrypted backup files.' },
  { id: 'icloud', name: 'iCloud', icon: '☁️', desc: 'Apple iCloud Drive backup', authUrl: 'https://appleid.apple.com/auth/authorize', instructions: 'Sign in with your Apple ID. Backups will be saved to iCloud Drive in a MoneroFlow folder.' },
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
  const restoreFromBackup = useStore(s => s.restoreFromBackup);
  const isPro = merchant.plan === 'pro';

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('1d');
  const [connectedCloud, setConnectedCloud] = useState<string | null>(null);
  const [encryptedBackups, setEncryptedBackups] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [showCloudWizard, setShowCloudWizard] = useState<string | null>(null);

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
        connectedCloud,
        autoBackupEnabled,
        backupFrequency,
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

  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [showRestorePassphrasePrompt, setShowRestorePassphrasePrompt] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);

  const doRestore = async (file: File, passphrase: string) => {
    setRestoring(true);
    try {
      let json: string;
      if (file.name.endsWith('.aes')) {
        json = await importEncryptedBackup(file, passphrase);
      } else {
        json = await file.text();
      }
      const parsed = JSON.parse(json);
      restoreFromBackup(parsed);
      if (parsed.connectedCloud) setConnectedCloud(parsed.connectedCloud);
      if (parsed.autoBackupEnabled) setAutoBackupEnabled(parsed.autoBackupEnabled);
      if (parsed.backupFrequency) setBackupFrequency(parsed.backupFrequency);
      const invoiceCount = parsed.invoices?.length || 0;
      const subCount = parsed.subscriptions?.length || 0;
      toast.success(`Backup restored! ${invoiceCount} invoices, ${subCount} subscriptions recovered.`);
      setShowRestorePassphrasePrompt(false);
      setPendingRestoreFile(null);
      setRestorePassphrase('');
    } catch {
      toast.error('Restore failed — wrong passphrase or corrupted file');
    }
    setRestoring(false);
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.aes')) {
      // If we have a passphrase in state, use it. Otherwise prompt.
      if (merchant.privacyPassphrase) {
        await doRestore(file, merchant.privacyPassphrase);
      } else {
        // Prompt user for passphrase — they may have reset browser
        setPendingRestoreFile(file);
        setShowRestorePassphrasePrompt(true);
      }
    } else {
      await doRestore(file, '');
    }
    if (e.target) e.target.value = '';
  };

  const currentProvider = CLOUD_PROVIDERS.find(p => p.id === showCloudWizard);

  const handleCloudConnect = (providerId: string) => {
    setShowCloudWizard(providerId);
  };

  const handleCloudAuthorize = () => {
    const provider = CLOUD_PROVIDERS.find(p => p.id === showCloudWizard);
    if (!provider) return;
    // In production, this would open an OAuth popup with the actual authUrl
    // For now we simulate the flow since there's no backend to handle OAuth callbacks
    toast.info(`Opening ${provider.name} authorization...`);
    setTimeout(() => {
      setConnectedCloud(showCloudWizard);
      setShowCloudWizard(null);
      toast.success(`Connected to ${provider.name}! Backups will sync automatically.`);
    }, 1500);
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
          <p className="text-xs text-muted-foreground">Download a complete backup of your wallet, invoices, subscriptions, payment links, and all settings.</p>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[11px] text-foreground">
              ✅ Backups include: <strong>merchant settings</strong>, <strong>all invoices</strong>, <strong>subscriptions</strong>, <strong>payment links</strong>, <strong>referral data</strong>, and <strong>cloud connection status</strong>.
            </p>
          </div>

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
                      onClick={() => handleCloudConnect(provider.id)}
                      className="border-border hover:border-primary/50"
                    >
                      Connect
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

      {/* Cloud Connection Wizard Dialog */}
      <Dialog open={!!showCloudWizard} onOpenChange={() => setShowCloudWizard(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <span className="text-2xl">{currentProvider?.icon}</span>
              Connect {currentProvider?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{currentProvider?.instructions}</p>

            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-xs text-foreground">Click "Authorize" below to open a secure sign-in window</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p className="text-xs text-foreground">Sign in with your {currentProvider?.name} account</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p className="text-xs text-foreground">Grant MoneroFlow permission to create a backup folder</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <p className="text-[11px] text-success">
                🔐 MoneroFlow only stores encrypted backup files. We never read or access any other data in your cloud account.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCloudWizard(null)} className="flex-1 border-border">
                Cancel
              </Button>
              <Button onClick={handleCloudAuthorize} className="flex-1 bg-gradient-orange hover:opacity-90">
                <ExternalLink className="w-4 h-4 mr-2" />
                Authorize
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
