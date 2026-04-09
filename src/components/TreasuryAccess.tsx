import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Eye, EyeOff, Copy, Check, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';

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

const CREATOR_PASSPHRASE = 'moneroflow-treasury-2026'; // Creator sets this during first access

interface TreasuryAccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TreasuryAccess({ open, onOpenChange }: TreasuryAccessProps) {
  const [step, setStep] = useState<'auth' | 'reveal' | 'locked'>('auth');
  const [passphrase, setPassphrase] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const handleAuth = () => {
    if (passphrase === CREATOR_PASSPHRASE) {
      setStep('reveal');
      // Start 60-second auto-lock countdown
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
    setRevealed(true);
    toast.success('Seed copied — store it OFFLINE immediately');
    setTimeout(() => setCopied(false), 3000);
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
      <DialogContent className="max-w-lg bg-card border-border">
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
                    This reveals the treasury wallet seed phrase and backup recovery codes.
                    Only the app creator should access this. Auto-locks after 60 seconds.
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

            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-xs text-warning font-medium">
                ⚠️ This screen auto-locks in {countdown}s. After that, you must re-authenticate.
                In production, the seed is encrypted with AES-256-GCM and stored in a hardware security module.
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
