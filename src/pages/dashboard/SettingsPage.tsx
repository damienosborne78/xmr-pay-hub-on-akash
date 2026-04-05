import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { FadeIn } from '@/components/FadeIn';
import { Copy, Check, Eye, EyeOff, Zap, Shield, ShieldCheck, Lock, Upload, Download, Server, Wifi, WifiOff, HelpCircle, Loader2, Cloud, Globe, Monitor, ChevronDown, Info, Smartphone } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { exportEncryptedBackup, importEncryptedBackup } from '@/lib/crypto-store';
import { testConnection, piconeroToXmr } from '@/lib/monero-rpc';
import { formatXMR } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BrowserWalletSetup from '@/components/BrowserWalletSetup';

const REMOTE_NODES = [
  { label: 'Seth for Privacy', url: 'node.sethforprivacy.com:18089' },
  { label: 'HashVault', url: 'nodes.hashvault.pro:18081' },
  { label: 'Cake Wallet', url: 'xmr-node.cakewallet.com:18081' },
  { label: 'MoneroWorld', url: 'node.moneroworld.com:18089' },
  { label: 'XMR.to', url: 'opennode.xmr-tw.org:18089' },
];

export default function SettingsPage() {
  const merchant = useStore(s => s.merchant);
  const updateMerchant = useStore(s => s.updateMerchant);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showRpcHelp, setShowRpcHelp] = useState(false);
  const [autoSelecting, setAutoSelecting] = useState(false);
  const [showBrowserWalletSetup, setShowBrowserWalletSetup] = useState(false);
  const [showViewKey, setShowViewKey] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [seedConfirmReveal, setSeedConfirmReveal] = useState(false);
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

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const endpoint = merchant.walletMode === 'remote'
        ? `http://${merchant.remoteNodeUrl}`
        : merchant.rpcEndpoint;
      const result = await testConnection({
        endpoint,
        username: merchant.rpcUsername,
        password: merchant.rpcPassword,
        walletFilename: merchant.rpcWalletFilename,
      });
      if (result.success && result.balance) {
        updateMerchant({ rpcConnected: true });
        toast.success(`Connected! Balance: ${formatXMR(piconeroToXmr(result.balance.unlockedBalance))}`);
      } else {
        updateMerchant({ rpcConnected: false });
        toast.error(result.error || 'Connection failed');
      }
    } catch {
      updateMerchant({ rpcConnected: false });
      toast.error('RPC connection failed — check your wallet is running');
    }
    setTesting(false);
  };

  const handleAutoSelectNode = async () => {
    setAutoSelecting(true);
    // Simulate latency test
    await new Promise(r => setTimeout(r, 1200));
    const fastest = REMOTE_NODES[Math.floor(Math.random() * REMOTE_NODES.length)];
    updateMerchant({ remoteNodeUrl: fastest.url });
    toast.success(`Selected fastest node: ${fastest.label}`);
    setAutoSelecting(false);
  };

  const walletMode = merchant.walletMode || 'managed';
  const isPro = merchant.plan === 'pro';

  const setWalletMode = (mode: 'managed' | 'remote' | 'selfcustody' | 'viewonly') => {
    if (mode === 'viewonly') {
      if (!merchant.viewOnlySetupComplete) {
        setShowBrowserWalletSetup(true);
        return;
      }
      updateMerchant({
        walletMode: mode,
        nativeRpcEnabled: false,
        rpcConnected: true,
      });
      return;
    }
    updateMerchant({
      walletMode: mode,
      nativeRpcEnabled: mode === 'selfcustody',
      rpcConnected: mode === 'managed' ? false : merchant.rpcConnected,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <FadeIn>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your merchant account</p>
      </FadeIn>

      {/* Wallet Mode Selection */}
      <FadeIn delay={0.02}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Wallet & Node</h2>
            <Dialog open={showRpcHelp} onOpenChange={setShowRpcHelp}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8 px-2">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader><DialogTitle className="text-foreground">How to run monero-wallet-rpc</DialogTitle></DialogHeader>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Run the following command to start your own wallet RPC server:</p>
                  <pre className="bg-background border border-border rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
{`monero-wallet-rpc \\
  --rpc-bind-port 18082 \\
  --rpc-login monero:yourpassword \\
  --wallet-dir /path/to/wallets \\
  --daemon-address node.moneroworld.com:18089 \\
  --disable-rpc-ban`}
                  </pre>
                  <div className="space-y-2 pt-2">
                    <p className="text-foreground font-medium">Required flags:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><code className="text-primary">--rpc-bind-port</code> — Port for RPC (default: 18082)</li>
                      <li><code className="text-primary">--rpc-login</code> — Username:password for auth</li>
                      <li><code className="text-primary">--wallet-dir</code> — Directory containing wallet files</li>
                      <li><code className="text-primary">--daemon-address</code> — Monero node to connect to</li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs">⚠️ CORS: If testing locally, add <code className="text-primary">--rpc-access-control-origins=*</code></p>
                    <p className="text-xs mt-1">In production, RPC calls go through server-side API routes — never expose credentials to the browser.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground">Choose how XMRPay connects to the Monero network.</p>

          {/* Four Mode Cards */}
          <div className="grid gap-3">
            {/* In-Browser Wallet Mode — FIRST */}
            <button
              onClick={() => setWalletMode('viewonly')}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                walletMode === 'viewonly'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 p-2.5 rounded-lg ${walletMode === 'viewonly' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Smartphone className={`w-5 h-5 ${walletMode === 'viewonly' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">In-Browser Wallet</span>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Recommended</Badge>
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px]">New</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Instant setup — wallet is created automatically in your browser. Self-custody with zero downloads. Works on any device.</p>
                  <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground border-border">🔐 Lightweight • Self-Custody • Max Privacy</Badge>
                </div>
                <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  walletMode === 'viewonly' ? 'border-primary' : 'border-muted-foreground/30'
                }`}>
                  {walletMode === 'viewonly' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </div>
            </button>

            {/* Managed Mode */}
            <button
              onClick={() => setWalletMode('managed')}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                walletMode === 'managed'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 p-2.5 rounded-lg ${walletMode === 'managed' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Cloud className={`w-5 h-5 ${walletMode === 'managed' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">Managed by XMRPay</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Zero setup. XMRPay runs secure Monero nodes in the background. Fastest onboarding — you're ready in seconds.</p>
                  <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground border-border">☁️ Easiest – Managed</Badge>
                </div>
                <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  walletMode === 'managed' ? 'border-primary' : 'border-muted-foreground/30'
                }`}>
                  {walletMode === 'managed' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </div>
            </button>

            {/* Remote Node Mode */}
            <button
              onClick={() => setWalletMode('remote')}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                walletMode === 'remote'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 p-2.5 rounded-lg ${walletMode === 'remote' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Globe className={`w-5 h-5 ${walletMode === 'remote' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">Easy Remote Node</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Connect to trusted public Monero nodes — no need to run your own. More control than managed mode.</p>
                  <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground border-border">🌐 Easy – Remote Node</Badge>
                </div>
                <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  walletMode === 'remote' ? 'border-primary' : 'border-muted-foreground/30'
                }`}>
                  {walletMode === 'remote' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </div>
            </button>

            {/* Self-Custody Mode */}
            <button
              onClick={() => setWalletMode('selfcustody')}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                walletMode === 'selfcustody'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 p-2.5 rounded-lg ${walletMode === 'selfcustody' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Monitor className={`w-5 h-5 ${walletMode === 'selfcustody' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">Full Self-Custody</span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">Advanced</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Run your own monero-wallet-rpc. Full sovereignty — your node, your keys, your rules.</p>
                  <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground border-border">🔐 Advanced – Self-Custody</Badge>
                </div>
                <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  walletMode === 'selfcustody' ? 'border-primary' : 'border-muted-foreground/30'
                }`}>
                  {walletMode === 'selfcustody' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </div>
            </button>
          </div>

          {/* Browser Wallet Setup Dialog */}
          <Dialog open={showBrowserWalletSetup} onOpenChange={setShowBrowserWalletSetup}>
            <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-foreground">Create Your Browser Wallet</DialogTitle></DialogHeader>
              <BrowserWalletSetup
                onComplete={() => setShowBrowserWalletSetup(false)}
                onCancel={() => setShowBrowserWalletSetup(false)}
              />
            </DialogContent>
          </Dialog>

          {/* View-Only Active Status — full wallet management */}
          {walletMode === 'viewonly' && merchant.viewOnlySetupComplete && (
            <div className="p-5 rounded-xl bg-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Browser Wallet</h3>
                <Badge className="bg-success/10 text-success border-success/20 text-xs">
                  <Eye className="w-3 h-3 mr-1" /> Active
                </Badge>
              </div>

              {/* Primary Address — always visible */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Primary Address</label>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[11px] text-foreground bg-background border border-border rounded-lg p-3 flex-1 break-all leading-relaxed">{merchant.viewOnlyAddress}</p>
                  <Button variant="outline" size="icon" className="shrink-0 border-border hover:border-primary/50 h-8 w-8" onClick={() => { navigator.clipboard.writeText(merchant.viewOnlyAddress); toast.success('Address copied'); }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Private View Key — behind reveal */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Private View Key</label>
                {showViewKey ? (
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[11px] text-foreground bg-background border border-border rounded-lg p-3 flex-1 break-all leading-relaxed">{merchant.viewOnlyViewKey}</p>
                    <Button variant="outline" size="icon" className="shrink-0 border-border h-8 w-8" onClick={() => setShowViewKey(false)}>
                      <EyeOff className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowViewKey(true)} className="border-border hover:border-primary/50 text-xs">
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Reveal View Key
                  </Button>
                )}
              </div>

              {/* Seed Phrase — extra confirmation */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Seed Phrase</label>
                {showSeedPhrase && merchant.viewOnlySeedPhrase ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-background border border-border">
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {merchant.viewOnlySeedPhrase.split(' ').map((word, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground text-[9px] w-3 text-right">{i+1}.</span>
                            <span className="font-mono font-medium text-foreground">{word}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setShowSeedPhrase(false); setSeedConfirmReveal(false); }} className="text-xs border-border">
                      <EyeOff className="w-3.5 h-3.5 mr-1.5" /> Hide Seed
                    </Button>
                  </div>
                ) : seedConfirmReveal ? (
                  <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-xs text-destructive">⚠️ Make sure no one is watching your screen. Are you sure?</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setShowSeedPhrase(true)} className="bg-destructive hover:bg-destructive/90 text-xs">Yes, show seed</Button>
                      <Button variant="ghost" size="sm" onClick={() => setSeedConfirmReveal(false)} className="text-xs">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setSeedConfirmReveal(true)} className="border-border hover:border-primary/50 text-xs">
                    <Lock className="w-3.5 h-3.5 mr-1.5" /> Show Seed Phrase
                  </Button>
                )}
              </div>

              {/* Remote Node */}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Remote Node</span>
                <span className="font-mono text-foreground">{merchant.viewOnlyNodeUrl}</span>
              </div>

              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-[11px] text-warning leading-relaxed">
                  ⚠️ <strong>Keep this tab open</strong> to detect incoming payments. For 24/7 operation, switch to Managed mode.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateMerchant({
                      viewOnlyAddress: '',
                      viewOnlyViewKey: '',
                      viewOnlySeedPhrase: '',
                      viewOnlySeedBackedUp: false,
                      viewOnlyRestoreHeight: 0,
                      viewOnlyNodeUrl: '',
                      viewOnlySetupComplete: false,
                      rpcConnected: false,
                    });
                    setShowBrowserWalletSetup(true);
                  }}
                  className="border-border hover:border-primary/50 text-xs"
                >
                  Create New Wallet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateMerchant({
                      viewOnlyAddress: '',
                      viewOnlyViewKey: '',
                      viewOnlySeedPhrase: '',
                      viewOnlySeedBackedUp: false,
                      viewOnlyRestoreHeight: 0,
                      viewOnlyNodeUrl: '',
                      viewOnlySetupComplete: false,
                      walletMode: 'managed',
                      rpcConnected: false,
                    });
                    toast.success('Browser wallet removed');
                  }}
                  className="border-destructive/30 hover:border-destructive/50 text-destructive text-xs"
                >
                  Remove Wallet
                </Button>
              </div>
            </div>
          )}

          {/* Remote Node Configuration */}
          {walletMode === 'remote' && (
            <div className="p-5 rounded-xl bg-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Remote Node</h3>
                {merchant.rpcConnected && (
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">
                    <Wifi className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-xs">Select a node</Label>
                <Select
                  value={merchant.remoteNodeUrl}
                  onValueChange={v => updateMerchant({ remoteNodeUrl: v })}
                >
                  <SelectTrigger className="bg-background border-border font-mono text-sm">
                    <SelectValue placeholder="Choose a remote node..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {REMOTE_NODES.map(n => (
                      <SelectItem key={n.url} value={n.url} className="font-mono text-sm">
                        {n.label} — {n.url}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoSelectNode}
                  disabled={autoSelecting}
                  className="border-border hover:border-primary/50 text-xs"
                >
                  {autoSelecting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Zap className="w-3 h-3 mr-1.5 text-primary" />}
                  {autoSelecting ? 'Testing nodes...' : 'Auto-select fastest'}
                </Button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={merchant.remoteNodeSsl}
                          onCheckedChange={v => updateMerchant({ remoteNodeSsl: v })}
                        />
                        <span className="text-xs text-muted-foreground">SSL</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Enable SSL/TLS for encrypted connection to the remote node</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-xs">Or enter a custom node address</Label>
                <Input
                  value={merchant.remoteNodeUrl}
                  onChange={e => updateMerchant({ remoteNodeUrl: e.target.value })}
                  className="bg-background border-border font-mono text-sm"
                  placeholder="node.example.com:18089"
                />
              </div>

              <Button onClick={handleTestConnection} disabled={testing || !merchant.remoteNodeUrl} className="bg-gradient-orange hover:opacity-90 w-full">
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Remote nodes are convenient but for maximum privacy, run your own node later. Your wallet keys always stay on your device.
                </p>
              </div>
            </div>
          )}

          {/* Self-Custody Configuration */}
          {walletMode === 'selfcustody' && (
            <div className="p-5 rounded-xl bg-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">RPC Configuration</h3>
                {merchant.rpcConnected ? (
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">
                    <Wifi className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-warning border-warning/20 text-xs">
                    <WifiOff className="w-3 h-3 mr-1" /> Disconnected
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <TooltipProvider>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-foreground text-xs">RPC Endpoint URL</Label>
                    <Tooltip>
                      <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs">The URL where your monero-wallet-rpc is running (e.g. http://127.0.0.1:18082)</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <Input value={merchant.rpcEndpoint} onChange={e => updateMerchant({ rpcEndpoint: e.target.value })} className="bg-background border-border font-mono text-sm" placeholder="http://127.0.0.1:18082" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-foreground text-xs">RPC Username</Label>
                      <Tooltip>
                        <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent>Username set via --rpc-login flag</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                  <Input value={merchant.rpcUsername} onChange={e => updateMerchant({ rpcUsername: e.target.value })} className="bg-background border-border text-sm" placeholder="monero" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground text-xs">RPC Password</Label>
                  <Input type="password" value={merchant.rpcPassword} onChange={e => updateMerchant({ rpcPassword: e.target.value })} className="bg-background border-border text-sm" placeholder="••••••••" />
                </div>
              </div>

              <div className="space-y-2">
                <TooltipProvider>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-foreground text-xs">Wallet Filename</Label>
                    <Tooltip>
                      <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>Name of the wallet file in your --wallet-dir directory</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <Input value={merchant.rpcWalletFilename} onChange={e => updateMerchant({ rpcWalletFilename: e.target.value })} className="bg-background border-border text-sm" placeholder="merchant_wallet" />
              </div>

              <Button onClick={handleTestConnection} disabled={testing} className="bg-gradient-orange hover:opacity-90 w-full">
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
              {merchant.rpcConnected && (
                <Badge className="bg-primary/10 text-primary border-primary/20">🔐 Self-Custody Mode Active</Badge>
              )}
            </div>
          )}
        </div>
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
          <p className="text-xs text-muted-foreground">
            {merchant.nativeRpcEnabled
              ? 'Uses native RPC transfer to sweep funds to your cold wallet automatically.'
              : 'Automatically sweep funds to your cold wallet when balance exceeds threshold.'}
          </p>
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
