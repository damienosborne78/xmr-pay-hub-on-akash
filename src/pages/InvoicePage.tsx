import { useParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { formatXMR, formatUSD } from '@/lib/mock-data';
import { BrandLogo, MoneroLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Clock, Copy, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/FadeIn';

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const invoices = useStore(s => s.invoices);
  const simulatePayment = useStore(s => s.simulatePayment);
  const invoice = invoices.find(i => i.id === id);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!invoice || invoice.status !== 'pending') return;
    const interval = setInterval(() => {
      const diff = new Date(invoice.expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [invoice]);

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Invoice not found</h1>
          <p className="text-muted-foreground">This invoice doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(invoice.subaddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = () => {
    simulatePayment(invoice.id);
    toast.success('🎉 Payment received!', { description: `${formatXMR(invoice.xmrAmount)} confirmed` });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <FadeIn className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <BrandLogo />
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground font-mono">{invoice.id}</p>
                <p className="text-sm font-medium text-foreground mt-1">{invoice.description}</p>
              </div>
              <Badge variant="outline"
                className={invoice.status === 'paid' ? 'bg-success/10 text-success border-success/20' : invoice.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' : 'text-muted-foreground'}>
                {invoice.status === 'paid' && <Check className="w-3 h-3 mr-1" />}
                {invoice.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                {invoice.status === 'expired' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {invoice.status}
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{formatUSD(invoice.fiatAmount)}</p>
              <p className="text-primary font-mono text-sm mt-1 flex items-center justify-center gap-1">
                <MoneroLogo size={16} /> {formatXMR(invoice.xmrAmount)}
              </p>
            </div>
          </div>

          {invoice.status === 'pending' && (
            <>
              <div className="p-6 flex flex-col items-center">
                <div className="bg-foreground p-3 rounded-xl mb-4">
                  <QRCodeSVG value={`monero:${invoice.subaddress}?tx_amount=${invoice.xmrAmount}`} size={180} bgColor="#fafafa" fgColor="#09090b" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">Send exactly</p>
                <p className="font-mono text-sm text-primary font-medium mb-4">{formatXMR(invoice.xmrAmount)}</p>
                <div className="w-full bg-muted/30 rounded-lg p-3 mb-3">
                  <p className="text-xs text-muted-foreground mb-1">To address:</p>
                  <p className="font-mono text-[10px] text-foreground break-all leading-relaxed">{invoice.subaddress}</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyAddress} className="border-border hover:border-primary/50 mb-4">
                  {copied ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
                  {copied ? 'Copied' : 'Copy Address'}
                </Button>
                {timeLeft && (
                  <p className="text-xs text-muted-foreground">Expires in <span className="text-warning font-mono">{timeLeft}</span></p>
                )}
              </div>
              <div className="px-6 pb-6">
                <Button onClick={handleSimulate} className="w-full bg-gradient-orange hover:opacity-90 glow-orange-sm">
                  ⚡ Simulate Payment Received
                </Button>
                <p className="text-[10px] text-muted-foreground text-center mt-2">Demo only — simulates a confirmed XMR payment</p>
              </div>
            </>
          )}

          {invoice.status === 'paid' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Payment Confirmed</h3>
              <p className="text-sm text-muted-foreground">
                {formatXMR(invoice.xmrAmount)} received on {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : ''}
              </p>
            </div>
          )}

          {invoice.status === 'expired' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Invoice Expired</h3>
              <p className="text-sm text-muted-foreground">This invoice is no longer valid.</p>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
