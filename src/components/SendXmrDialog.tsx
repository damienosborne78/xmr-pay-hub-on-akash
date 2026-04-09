import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { useRates } from '@/hooks/use-rates';
import { getXmrPrice } from '@/lib/currency-service';
import { formatXMR, formatFiat } from '@/lib/mock-data';
import { Send, Zap, Clock, Camera, Loader2, AlertTriangle, Check, Lock, X, Wallet, ExternalLink, Radio, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { verifyTxOutputs, getMempoolTxHashes } from '@/lib/block-explorer';
import { motion } from 'framer-motion';

// Fee tiers for sending
const SEND_FEE_TIERS = [
  { id: 'normal', label: 'Normal', priority: 1, feeXmr: 0.000012, eta: '~20 min' },
  { id: 'fast', label: 'Fast', priority: 2, feeXmr: 0.000024, eta: '~10 min' },
  { id: 'urgent', label: 'Urgent', priority: 3, feeXmr: 0.000048, eta: '~2 min' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendXmrDialog({ open, onOpenChange }: Props) {
  const merchant = useStore(s => s.merchant);
  const invoices = useStore(s => s.invoices);
  const { rates } = useRates();
  const sym = merchant.fiatSymbol || '$';
  const cur = merchant.fiatCurrency || 'USD';
  const users = merchant.posUsers || [];
  const hasMultipleUsers = users.length > 0;

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amountXmr, setAmountXmr] = useState('');
  const [amountFiat, setAmountFiat] = useState('');
  const [feeTier, setFeeTier] = useState('normal');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [step, setStep] = useState<'auth' | 'form' | 'confirm' | 'sent'>('form');
  const [adminPass, setAdminPass] = useState('');
  const [adminAuthed, setAdminAuthed] = useState(false);

  const xmrPrice = rates ? getXmrPrice(cur, rates) : null;
  const selectedFee = SEND_FEE_TIERS.find(t => t.id === feeTier) || SEND_FEE_TIERS[0];
  const parsedAmount = parseFloat(amountXmr) || 0;
  const totalWithFee = parsedAmount + selectedFee.feeXmr;

  const fiatEquivalent = xmrPrice ? parsedAmount * xmrPrice : null;
  const feeInFiat = xmrPrice ? selectedFee.feeXmr * xmrPrice : null;

  // Wallet balance (simulated — in production would come from RPC)
  const paidInvoices = invoices.filter(i => i.status === 'paid' && i.type !== 'sent' && !i.simulated);
  const sentInvoices = invoices.filter(i => i.type === 'sent');
  const totalReceived = paidInvoices.reduce((s, i) => s + i.xmrAmount, 0);
  const totalSent = sentInvoices.reduce((s, i) => s + i.xmrAmount + (i.feeXmr || 0), 0);
  const walletBalance = Math.max(0, totalReceived - totalSent);
  const walletBalanceFiat = xmrPrice ? walletBalance * xmrPrice : null;

  // Determine if admin auth is required: only when multiple users exist
  const needsAuth = hasMultipleUsers && !adminAuthed;

  // Set initial step based on auth requirement
  useEffect(() => {
    if (open) {
      setStep(needsAuth ? 'auth' : 'form');
    }
  }, [open, needsAuth]);

  // Sync XMR ↔ fiat amounts
  const handleXmrChange = (val: string) => {
    setAmountXmr(val);
    const num = parseFloat(val);
    if (xmrPrice && num > 0) {
      setAmountFiat((num * xmrPrice).toFixed(2));
    } else {
      setAmountFiat('');
    }
  };

  const handleFiatChange = (val: string) => {
    setAmountFiat(val);
    const num = parseFloat(val);
    if (xmrPrice && num > 0) {
      setAmountXmr((num / xmrPrice).toFixed(6));
    } else {
      setAmountXmr('');
    }
  };

  // Basic address validation
  const isValidAddress = recipientAddress.length === 95 || recipientAddress.length === 106;
  const canSend = isValidAddress && parsedAmount > 0;

  // Hash function — must match UsersPage/InvoicesPage exactly
  const hashPassword = (pw: string) => {
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
      const chr = pw.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  };

  // Admin password check
  const handleAdminAuth = () => {
    if (!merchant.adminPasswordHash) {
      setAdminAuthed(true);
      setStep('form');
      return;
    }
    if (hashPassword(adminPass) === merchant.adminPasswordHash) {
      setAdminAuthed(true);
      setStep('form');
      setAdminPass('');
    } else {
      toast.error('Incorrect admin password');
    }
  };

  // Parse monero: URI from QR scan
  const parseMoneroUri = useCallback((uri: string) => {
    const cleaned = uri.replace(/^monero:/, '');
    const [address, params] = cleaned.split('?');
    if (address) {
      setRecipientAddress(address);
      setShowScanner(false);
      toast.success('Address scanned!');
    }
    if (params) {
      const searchParams = new URLSearchParams(params);
      const txAmount = searchParams.get('tx_amount');
      if (txAmount) {
        handleXmrChange(txAmount);
      }
    }
  }, [xmrPrice]);

  const handleSend = async () => {
    setSending(true);

    try {
      if (!merchant.viewOnlySpendKey) {
        toast.error('Send requires a full wallet (spend key). View-only wallets cannot send.');
        setSending(false);
        return;
      }

      // Simulate transaction creation delay
      await new Promise(r => setTimeout(r, 2000));

      // Generate a TX hash for the send
      const txHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      // Log the sent transaction as an invoice entry
      const sentEntry = {
        id: `send-${Date.now()}`,
        fiatAmount: fiatEquivalent || 0,
        fiatCurrency: cur,
        xmrAmount: parsedAmount,
        subaddress: recipientAddress,
        status: 'paid' as const,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        description: note || 'Sent XMR',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        txid: txHash,
        createdBy: 'admin',
        type: 'sent' as const,
        recipientAddress,
        feeTier: selectedFee.id,
        feeXmr: selectedFee.feeXmr,
        note,
      };

      // Add to invoices store
      useStore.setState(state => ({
        invoices: [...state.invoices, sentEntry],
      }));

      toast.success('Transaction submitted!', {
        description: `TX: ${txHash.slice(0, 16)}... · Fee: ${formatXMR(selectedFee.feeXmr)}`,
      });

      setStep('sent');
    } catch (err) {
      toast.error('Transaction failed. Please try again.');
    }

    setSending(false);
  };

  const resetForm = () => {
    setRecipientAddress('');
    setAmountXmr('');
    setAmountFiat('');
    setFeeTier('normal');
    setNote('');
    setStep(needsAuth ? 'auth' : 'form');
    setAdminPass('');
    setAdminAuthed(false);
    setShowScanner(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Send XMR
          </DialogTitle>
        </DialogHeader>

        {/* ── Admin Auth Gate ── */}
        {step === 'auth' && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
              <p className="text-xs text-warning flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                Admin authentication required to send XMR when multiple users are active.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Admin Password</Label>
              <Input
                type="password"
                value={adminPass}
                onChange={e => setAdminPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminAuth()}
                placeholder="Enter admin password"
                className="bg-background border-border"
                autoFocus
              />
            </div>
            <Button onClick={handleAdminAuth} className="w-full bg-gradient-orange hover:opacity-90">
              <Lock className="w-4 h-4 mr-2" />
              Authenticate
            </Button>
          </div>
        )}

        {/* ── Send Form ── */}
        {step === 'form' && (
          <div className="space-y-4">
            {/* Wallet Balance (shown when admin is authed or single-user) */}
            {(!hasMultipleUsers || adminAuthed) && (
              <div className="rounded-lg bg-muted/20 border border-border p-3 flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wallet Balance</p>
                  <p className="text-sm font-bold text-foreground font-mono">{formatXMR(walletBalance)}</p>
                </div>
                {walletBalanceFiat !== null && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      {sym}{walletBalanceFiat.toFixed(2)} {cur}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* QR Scanner overlay */}
            {showScanner && (
              <LiveQrScanner
                onScan={parseMoneroUri}
                onClose={() => setShowScanner(false)}
              />
            )}

            {/* Recipient Address */}
            <div className="space-y-2">
              <Label className="text-foreground">Recipient Address</Label>
              <div className="flex gap-2">
                <Input
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                  placeholder="Monero address (95 or 106 characters)"
                  className="bg-background border-border font-mono text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowScanner(true)}
                  className="border-border hover:border-primary/50 shrink-0"
                  title="Scan QR code"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              {recipientAddress && !isValidAddress && (
                <p className="text-[10px] text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Invalid address length. Must be 95 (standard/subaddress) or 106 (integrated) characters.
                </p>
              )}
              {recipientAddress && isValidAddress && (
                <p className="text-[10px] text-success flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {recipientAddress.startsWith('4') ? 'Standard address' : recipientAddress.startsWith('8') ? 'Subaddress' : 'Integrated address'}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-foreground">Amount (XMR)</Label>
                <Input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={amountXmr}
                  onChange={e => handleXmrChange(e.target.value)}
                  placeholder="0.000000"
                  className="bg-background border-border font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Amount ({cur})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountFiat}
                  onChange={e => handleFiatChange(e.target.value)}
                  placeholder="0.00"
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Fee Tier Selection */}
            <div className="space-y-2">
              <Label className="text-foreground">Transaction Priority</Label>
              <div className="grid grid-cols-3 gap-2">
                {SEND_FEE_TIERS.map(tier => (
                  <button
                    key={tier.id}
                    onClick={() => setFeeTier(tier.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      feeTier === tier.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {tier.id === 'normal' ? <Clock className="w-3 h-3" /> :
                       tier.id === 'fast' ? <Zap className="w-3 h-3" /> :
                       <Zap className="w-3 h-3 text-destructive" />}
                      <span className="text-xs font-medium">{tier.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{tier.eta}</p>
                    <p className="text-[10px] font-mono mt-0.5">
                      {tier.feeXmr.toFixed(6)} XMR
                    </p>
                    {feeInFiat !== null && (
                      <p className="text-[10px] text-muted-foreground">
                        {sym}{(tier.feeXmr * (xmrPrice || 0)).toFixed(4)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-2">
              <Label className="text-foreground">Note (optional, local only)</Label>
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="What's this payment for?"
                className="bg-background border-border text-sm resize-none h-16"
              />
            </div>

            {/* Summary */}
            {parsedAmount > 0 && (
              <div className="rounded-lg bg-muted/20 border border-border p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-foreground font-mono">{formatXMR(parsedAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Network fee ({selectedFee.label})</span>
                  <span className="text-foreground font-mono">{formatXMR(selectedFee.feeXmr)}</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between text-xs font-medium">
                  <span className="text-foreground">Total</span>
                  <div className="text-right">
                    <span className="text-primary font-mono">{formatXMR(totalWithFee)}</span>
                    {fiatEquivalent !== null && feeInFiat !== null && (
                      <p className="text-[10px] text-muted-foreground">
                        ≈ {sym}{(fiatEquivalent + feeInFiat).toFixed(2)} {cur}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep('confirm')}
              disabled={!canSend}
              className="w-full bg-gradient-orange hover:opacity-90"
            >
              <Send className="w-4 h-4 mr-2" />
              Review Transaction
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
              <p className="text-xs text-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Please verify all details carefully. Monero transactions are irreversible.
              </p>
            </div>

            <div className="rounded-lg bg-muted/20 border border-border p-4 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sending to</p>
                <p className="font-mono text-[10px] text-foreground break-all mt-1">{recipientAddress}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount</p>
                  <p className="text-sm font-bold text-primary font-mono">{formatXMR(parsedAmount)}</p>
                  {fiatEquivalent !== null && (
                    <p className="text-[10px] text-muted-foreground">≈ {sym}{fiatEquivalent.toFixed(2)}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fee</p>
                  <p className="text-sm font-mono text-foreground">{formatXMR(selectedFee.feeXmr)}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedFee.label} · {selectedFee.eta}</p>
                </div>
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Deducted</p>
                <p className="text-lg font-bold text-foreground font-mono">{formatXMR(totalWithFee)}</p>
              </div>
              {note && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Note</p>
                  <p className="text-xs text-foreground">{note}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1 border-border">
                Back
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 bg-gradient-orange hover:opacity-90"
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {sending ? 'Sending...' : 'Confirm & Send'}
              </Button>
            </div>
          </div>
        )}

        {step === 'sent' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Transaction Submitted!</h3>
            <p className="text-sm text-muted-foreground">
              {formatXMR(parsedAmount)} sent to {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-8)}
            </p>
            <p className="text-xs text-muted-foreground">
              Expected confirmation: {selectedFee.eta}
            </p>
            <Button onClick={() => { resetForm(); onOpenChange(false); }} className="w-full bg-gradient-orange hover:opacity-90">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Live QR Scanner Component ───
// Uses getUserMedia + BarcodeDetector for real-time QR code scanning
function LiveQrScanner({ onScan, onClose }: { onScan: (data: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let animFrame: number;

    async function startScanning() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Check for BarcodeDetector support
        if (!('BarcodeDetector' in window)) {
          setError('QR scanning not supported in this browser. Please paste the address manually.');
          return;
        }

        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

        // Continuous scanning loop
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0) {
              onScan(results[0].rawValue);
              return; // Stop scanning after successful detection
            }
          } catch { /* ignore detection errors, keep scanning */ }
          animFrame = requestAnimationFrame(scan);
        };

        // Wait for video to be ready before scanning
        setTimeout(() => { if (!cancelled) scan(); }, 500);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access and try again.'
            : 'Could not access camera. Please paste the address manually.');
        }
      }
    }

    startScanning();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrame);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onScan]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-primary/30 bg-black">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Camera className="w-3 h-3" /> Point at a Monero QR code
        </p>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="w-3 h-3" />
        </Button>
      </div>
      {error ? (
        <div className="p-6 text-center">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      ) : (
        <div className="relative aspect-[4/3]">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {/* Scanning crosshair overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-primary/60 rounded-lg relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
              {/* Animated scan line */}
              <div className="absolute left-1 right-1 h-0.5 bg-primary/80 animate-pulse top-1/2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
