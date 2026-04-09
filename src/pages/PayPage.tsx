import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { formatUSD, formatXMR, usdToXmr, XMR_USD_RATE } from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { createSubaddress } from '@/lib/monero-rpc';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoneroLogo } from '@/components/BrandLogo';
import { Check, Clock, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentProgress } from '@/components/PaymentProgress';

export default function PayPage() {
  const { amount, label } = useParams();
  const fiatAmount = parseFloat(amount || '0');
  const xmrAmount = usdToXmr(fiatAmount);
  const getRpcConfig = useStore(s => s.getRpcConfig);
  const pollInvoicePayment = useStore(s => s.pollInvoicePayment);
  const createInvoice = useStore(s => s.createInvoice);
  const invoices = useStore(s => s.invoices);

  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [subaddress, setSubaddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(3600);
  const [copied, setCopied] = useState(false);

  const invoice = invoices.find(i => i.id === invoiceId);
  const paid = invoice?.status === 'paid';

  // Create invoice with real subaddress on mount
  useEffect(() => {
    if (!fiatAmount || fiatAmount <= 0) { setLoading(false); return; }

    const init = async () => {
      try {
        const inv = await createInvoice(
          label ? decodeURIComponent(label).replace(/-/g, ' ') : 'Payment Link',
          fiatAmount
        );
        setInvoiceId(inv.id);
        setSubaddress(inv.subaddress);
      } catch (e) {
        setError((e as Error).message || 'Failed to create payment address. Check RPC connection.');
      }
      setLoading(false);
    };
    init();
  }, [fiatAmount]);

  // Poll for payment
  useEffect(() => {
    if (!invoiceId || paid) return;
    const interval = setInterval(() => {
      pollInvoicePayment(invoiceId);
    }, 12000);
    return () => clearInterval(interval);
  }, [invoiceId, paid]);

  // Countdown
  useEffect(() => {
    if (paid || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [paid, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const copyAddr = () => {
    navigator.clipboard.writeText(subaddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!fiatAmount || fiatAmount <= 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">Invalid payment link.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Creating payment address via RPC...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-destructive font-medium">Connection Error</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-card border border-border p-8 space-y-6">
          <div className="text-center">
            <MoneroLogo size={32} />
            <h1 className="text-xl font-bold text-foreground mt-3">
              {label ? decodeURIComponent(label).replace(/-/g, ' ') : 'Payment'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Pay with Monero (XMR)</p>
          </div>

          {paid ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Payment Confirmed</h2>
              <p className="text-muted-foreground">{formatUSD(fiatAmount)} received — thank you!</p>
              {invoice?.txid && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">TX ID</p>
                  <p className="font-mono text-[10px] text-foreground break-all">{invoice.txid}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">{formatUSD(fiatAmount)}</p>
                <p className="text-primary font-mono mt-1">{formatXMR(xmrAmount)}</p>
                <p className="text-muted-foreground text-xs mt-1">1 XMR = {formatUSD(XMR_USD_RATE)}</p>
              </div>

              <div className="flex justify-center">
                <div className="bg-white rounded-2xl p-5">
                  <QRCodeSVG value={`monero:${subaddress}?tx_amount=${xmrAmount.toFixed(12)}`} size={200} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Send exactly to this address:</p>
                <button onClick={copyAddr} className="w-full p-3 rounded-lg bg-muted/30 border border-border text-xs font-mono text-muted-foreground break-all hover:border-primary/30 transition-colors text-left">
                  {subaddress}
                </button>
                <div className="flex items-center justify-between">
                  <button onClick={copyAddr} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy address'}
                  </button>
                  <Badge variant="outline" className="text-warning border-warning/20">
                    <Clock className="w-3 h-3 mr-1" /> {mins}:{secs.toString().padStart(2, '0')}
                  </Badge>
                </div>
              </div>

              {/* Smart confirmation progress */}
              {invoiceId && (
                <PaymentProgress
                  invoiceId={invoiceId}
                  fiatAmount={fiatAmount}
                  xmrAmount={xmrAmount}
                  subaddress={subaddress}
                />
              )}
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Powered by <span className="text-primary font-medium">MoneroFlow</span>
          </p>
        </div>
      </div>
    </div>
  );
}
