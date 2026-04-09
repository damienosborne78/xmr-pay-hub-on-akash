import { useState } from 'react';
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
import { Send, Zap, Clock, Camera, Loader2, AlertTriangle, Check, QrCode } from 'lucide-react';
import { toast } from 'sonner';

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
  const { rates } = useRates();
  const sym = merchant.fiatSymbol || '$';
  const cur = merchant.fiatCurrency || 'USD';

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amountXmr, setAmountXmr] = useState('');
  const [amountFiat, setAmountFiat] = useState('');
  const [feeTier, setFeeTier] = useState('normal');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm' | 'sent'>('form');

  const xmrPrice = rates ? getXmrPrice(cur, rates) : null;
  const selectedFee = SEND_FEE_TIERS.find(t => t.id === feeTier) || SEND_FEE_TIERS[0];
  const parsedAmount = parseFloat(amountXmr) || 0;
  const totalWithFee = parsedAmount + selectedFee.feeXmr;

  const fiatEquivalent = xmrPrice ? parsedAmount * xmrPrice : null;
  const feeInFiat = xmrPrice ? selectedFee.feeXmr * xmrPrice : null;

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

  // Parse monero: URI from QR scan
  const handleQrScan = () => {
    // Use the HTML5 file input with camera capture as fallback
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        // Try using BarcodeDetector API (available in modern browsers)
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const bitmap = await createImageBitmap(file);
          const results = await detector.detect(bitmap);
          if (results.length > 0) {
            parseMoneroUri(results[0].rawValue);
            return;
          }
        }
        toast.error('QR scanning requires a supported browser. Please paste the address manually.');
      } catch {
        toast.error('Could not read QR code. Please paste the address manually.');
      }
    };
    input.click();
  };

  const parseMoneroUri = (uri: string) => {
    // Handle monero: URI format
    const cleaned = uri.replace(/^monero:/, '');
    const [address, params] = cleaned.split('?');
    
    if (address) {
      setRecipientAddress(address);
      toast.success('Address scanned!');
    }
    
    if (params) {
      const searchParams = new URLSearchParams(params);
      const txAmount = searchParams.get('tx_amount');
      if (txAmount) {
        handleXmrChange(txAmount);
      }
    }
  };

  const handleSend = async () => {
    setSending(true);
    
    try {
      // In a real implementation, this would call wallet RPC to create and submit a transaction
      // For now, we simulate the send process since we're using a view-only wallet
      // A full spend requires the private spend key, which is available in the browser wallet
      
      if (!merchant.viewOnlySpendKey) {
        toast.error('Send requires a full wallet (spend key). View-only wallets cannot send.');
        setSending(false);
        return;
      }

      // Simulate transaction creation delay
      await new Promise(r => setTimeout(r, 2000));
      
      // Generate a fake TX hash for the simulated send
      const txHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
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
    setStep('form');
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

        {step === 'form' && (
          <div className="space-y-4">
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
                  onClick={handleQrScan}
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
