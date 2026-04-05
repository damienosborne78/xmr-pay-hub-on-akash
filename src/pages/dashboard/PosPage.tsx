import { useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { formatUSD, formatXMR, usdToXmr } from '@/lib/mock-data';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Delete, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PosPage() {
  const createInvoice = useStore(s => s.createInvoice);
  const pollInvoicePayment = useStore(s => s.pollInvoicePayment);
  const invoices = useStore(s => s.invoices);
  const [input, setInput] = useState('0');
  const [activeInvoice, setActiveInvoice] = useState<{ id: string; fiatAmount: number; xmrAmount: number; subaddress: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const invoice = invoices.find(i => i.id === activeInvoice?.id);
  const paid = invoice?.status === 'paid';

  // Poll for payment when invoice is active
  useState(() => {
    if (!activeInvoice || paid) return;
    const interval = setInterval(() => {
      pollInvoicePayment(activeInvoice.id);
    }, 12000);
    return () => clearInterval(interval);
  });

  const handleKey = useCallback((key: string) => {
    if (activeInvoice) return;
    setInput(prev => {
      if (key === 'C') return '0';
      if (key === '⌫') return prev.length <= 1 ? '0' : prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      if (prev === '0' && key !== '.') return key;
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      return prev + key;
    });
  }, [activeInvoice]);

  const handleCharge = async () => {
    const amount = parseFloat(input);
    if (!amount || amount <= 0) return;
    setCreating(true);
    try {
      const inv = await createInvoice('PoS Sale', amount);
      setActiveInvoice({ id: inv.id, fiatAmount: inv.fiatAmount, xmrAmount: inv.xmrAmount, subaddress: inv.subaddress });
    } catch (e) {
      toast.error((e as Error).message || 'Failed to create invoice. Check RPC connection.');
    }
    setCreating(false);
  };

  const handleNewSale = () => {
    setActiveInvoice(null);
    setInput('0');
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

  if (paid && activeInvoice) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <Check className="w-12 h-12 text-success" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">{formatUSD(activeInvoice.fiatAmount)}</h2>
            <p className="text-muted-foreground mt-1">Payment Confirmed</p>
            {invoice?.txid && (
              <p className="text-xs font-mono text-muted-foreground mt-2 break-all max-w-xs mx-auto">TX: {invoice.txid.slice(0, 16)}...</p>
            )}
          </div>
          <Button onClick={handleNewSale} className="bg-gradient-orange hover:opacity-90 px-8 py-3 text-lg">New Sale</Button>
        </div>
      </div>
    );
  }

  if (activeInvoice) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div>
            <p className="text-muted-foreground text-sm mb-1">Customer owes</p>
            <h2 className="text-4xl font-bold text-foreground">{formatUSD(activeInvoice.fiatAmount)}</h2>
            <p className="text-primary font-mono mt-1">{formatXMR(activeInvoice.xmrAmount)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 inline-block">
            <QRCodeSVG value={`monero:${activeInvoice.subaddress}?tx_amount=${activeInvoice.xmrAmount.toFixed(12)}`} size={220} />
          </div>
          <p className="text-muted-foreground text-xs font-mono break-all px-4">{activeInvoice.subaddress.slice(0, 20)}...{activeInvoice.subaddress.slice(-10)}</p>
          <p className="text-[10px] text-muted-foreground">Polling for payment every 12s...</p>
          <Button variant="outline" onClick={handleNewSale} className="border-border">Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <Badge variant="outline" className="mb-4 text-primary border-primary/20">PoS Mode</Badge>
          <div className="text-5xl font-bold text-foreground tracking-tight tabular-nums">
            ${input}
          </div>
          <p className="text-muted-foreground text-sm mt-2 font-mono">
            ≈ {formatXMR(usdToXmr(parseFloat(input) || 0))}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {keys.map(key => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="h-16 rounded-xl bg-card border border-border text-foreground text-xl font-medium hover:bg-muted/30 hover:border-primary/30 active:scale-95 transition-all"
            >
              {key === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : key}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handleKey('C')} className="h-14 rounded-xl bg-muted/30 border border-border text-muted-foreground font-medium hover:bg-muted/50 transition-all">
            Clear
          </button>
          <button
            onClick={handleCharge}
            disabled={!parseFloat(input) || creating}
            className="h-14 rounded-xl bg-gradient-orange text-white font-bold hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {creating ? 'Creating...' : 'Charge'}
          </button>
        </div>
      </div>
    </div>
  );
}
