import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Eye, EyeOff, Copy, Check, AlertTriangle, Lock, Gift, Sparkles, Server } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';

// Treasury seed phrase — in production this would be generated once and shown to the creator
const TREASURY_SEED = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent',
  'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
  'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire',
  'across', 'act', 'action', 'actor', 'actress', 'actual', 'adapt'
];

// 6 backup recovery codes — each is a one-time use code
const BACKUP_CODES = [
  'MF-7K9X-R2P4', 'MF-3L8W-J5N1', 'MF-9Q2D-T6M8',
  'MF-4V7H-B3K5', 'MF-6Y1C-F8W2', 'MF-2N5G-X4J9'
];

const CREATOR_PASSPHRASE = 'moneroflow-treasury-2026';

interface TreasuryAccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateProCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MF-PRO-';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function TreasuryAccess({ open, onOpenChange }: TreasuryAccessProps) {
  const merchant = useStore(s => s.merchant);
  const updateMerchant = useStore(s => s.updateMerchant);

  const [step, setStep] = useState<'auth' | 'reveal' | 'locked'>('auth');
  const [passphrase, setPassphrase] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [fqdnInput, setFqdnInput] = useState(merchant.creatorServerFqdn || '');

  const generatedCodes = merchant.lifetimeProCodes || [];

  const handleAuth = () => {
    if (passphrase === CREATOR_PASSPHRASE) {
      setStep('reveal');
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setStep('locked');
            setShowSeed(false);
            setShowCodes(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      toast.success('Access granted. You have 60 seconds.');
    } else {
      toast.error('Invalid passphrase');
    }
  };

  const copySeed = () => {
    navigator.clipboard.writeText(TREASURY_SEED.join(' '));
    setCopied(true);
    toast.success('Seed copied — store it OFFLINE immediately');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleGenerateProCode = () => {
    const code = generateProCode();
    const entry = { code, createdAt: new Date().toISOString() };
    const updated = [...generatedCodes, entry];
    updateMerchant({ lifetimeProCodes: updated });

    // Sync to creator server if configured
    if (merchant.creatorServerFqdn) {
      fetch(`https://${merchant.creatorServerFqdn}/api/mf/codes/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {});
    }

    toast.success(`Lifetime Pro code generated: ${code}`);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveFqdn = () => {
    const clean = fqdnInput.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    updateMerchant({ creatorServerFqdn: clean });
    toast.success(`Creator server set to: ${clean}`);
  };

  const handleClose = () => {
    setStep('auth');
    setPassphrase('');
    setShowSeed(false);
    setShowCodes(false);
    setCopied(false);
    setCountdown(60);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" /> Treasury Master Access
          </DialogTitle>
        </DialogHeader>

        {step === 'auth' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Creator-Only Access</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This reveals the treasury wallet seed phrase, backup recovery codes, and lets you generate lifetime Pro subscription codes.
                    Auto-locks after 60 seconds.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Enter creator passphrase:</label>
              <Input
                type="password"
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                placeholder="••••••••••••"
                className="bg-background border-border font-mono"
              />
            </div>
            <Button onClick={handleAuth} className="w-full bg-gradient-orange hover:opacity-90" disabled={!passphrase}>
              <Lock className="w-4 h-4 mr-2" /> Authenticate
            </Button>
          </div>
        )}

        {step === 'reveal' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary/20 text-primary border-primary/30">Access Granted</Badge>
              <Badge variant="outline" className="text-destructive border-destructive/30 font-mono">
                Auto-lock: {countdown}s
              </Badge>
            </div>

            {/* Creator Server FQDN */}
            <div className="space-y-2 p-4 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium text-foreground">Creator Server FQDN</label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Set your self-hosted server domain. Pro codes are stored in the app database and synced to this server for cross-browser validation.
              </p>
              <div className="flex gap-2">
                <Input
                  value={fqdnInput}
                  onChange={e => setFqdnInput(e.target.value)}
                  placeholder="api.yourdomain.com"
                  className="bg-card border-border font-mono text-sm flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleSaveFqdn} className="border-border shrink-0">
                  Save
                </Button>
              </div>
              {merchant.creatorServerFqdn && (
                <p className="text-[10px] text-primary">✓ Server: {merchant.creatorServerFqdn}</p>
              )}
            </div>

            {/* Seed Phrase */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Treasury Seed Phrase (25 words)</label>
                <Button variant="ghost" size="sm" onClick={() => setShowSeed(!showSeed)}>
                  {showSeed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-background border border-border">
                {showSeed ? (
                  <div className="space-y-2">
                    <p className="font-mono text-xs text-foreground leading-relaxed break-all select-all">
                      {TREASURY_SEED.join(' ')}
                    </p>
                    <Button variant="outline" size="sm" onClick={copySeed} className="border-border">
                      {copied ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
                      {copied ? 'Copied!' : 'Copy Seed'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Click the eye icon to reveal</p>
                )}
              </div>
            </div>

            {/* Backup Recovery Codes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Backup Recovery Codes</label>
                <Button variant="ghost" size="sm" onClick={() => setShowCodes(!showCodes)}>
                  {showCodes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
              {showCodes && (
                <div className="grid grid-cols-2 gap-2">
                  {BACKUP_CODES.map((code, i) => (
                    <div key={i} className="p-2 rounded bg-background border border-border text-center">
                      <span className="font-mono text-xs text-primary">{code}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Each code can restore access if you lose your passphrase. Store them separately and offline.
              </p>
            </div>

            {/* Lifetime Pro Code Generator */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <label className="text-sm font-medium text-foreground">Lifetime Pro Codes</label>
                </div>
                <Button
                  size="sm"
                  onClick={handleGenerateProCode}
                  className="bg-gradient-orange hover:opacity-90"
                >
                  <Gift className="w-3.5 h-3.5 mr-1.5" /> Generate Code
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Codes are stored in the app database (synced via backups &amp; creator server). When a recipient enters a code, it unlocks Pro for LIFE.
              </p>

              {generatedCodes.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {generatedCodes.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold tracking-wider ${entry.usedBy ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                          {entry.code}
                        </span>
                        {entry.usedBy && <Badge className="bg-muted/10 text-muted-foreground border-muted/20 text-[9px]">USED</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</span>
                        {!entry.usedBy && (
                          <Button variant="ghost" size="sm" onClick={() => handleCopyCode(entry.code)} className="h-7 px-1.5">
                            {copiedCode === entry.code ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {generatedCodes.length === 0 && (
                <div className="text-center py-3 text-xs text-muted-foreground">
                  No codes generated yet. Click "Generate Code" to create one.
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-xs text-warning font-medium">
                ⚠️ This screen auto-locks in {countdown}s. After that, you must re-authenticate.
              </p>
            </div>
          </div>
        )}

        {step === 'locked' && (
          <div className="text-center py-6 space-y-3">
            <Lock className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Session timed out. Re-authenticate to access treasury.</p>
            <Button variant="outline" onClick={() => { setStep('auth'); setCountdown(60); }}>
              Re-authenticate
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
