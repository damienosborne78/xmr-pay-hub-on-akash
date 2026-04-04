import { useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { formatUSD, formatXMR, usdToXmr, generateSubaddress } from '@/lib/mock-data';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Delete, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function PosPage() {
  const createInvoice = useStore(s => s.createInvoice);
  const simulatePayment = useStore(s => s.simulatePayment);
  const [input, setInput] = useState('0');
  const [activeInvoice, setActiveInvoice] = useState<{ id: string; fiatAmount: number; xmrAmount: number; subaddress: string } | null>(null);
  const [paid, setPaid] = useState(false);

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

  const handleCharge = () => {
    const amount = parseFloat(input);
    if (!amount || amount <= 0) return;
    const inv = createInvoice('PoS Sale', amount);
    setActiveInvoice({ id: inv.id, fiatAmount: inv.fiatAmount, xmrAmount: inv.xmrAmount, subaddress: inv.subaddress });
  };

  const handleSimulatePayment = () => {
    if (!activeInvoice) return;
    simulatePayment(activeInvoice.id);
    setPaid(true);
    toast.success('Payment received!');
  };

  const handleNewSale = () => {
    setActiveInvoice(null);
    setPaid(false);
    setInput('0');
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

  if (paid) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <Check className="w-12 h-12 text-success" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">{formatUSD(activeInvoice!.fiatAmount)}</h2>
            <p className="text-muted-foreground mt-1">Payment Confirmed</p>
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
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleNewSale} className="border-border">Cancel</Button>
            <Button onClick={handleSimulatePayment} className="bg-gradient-orange hover:opacity-90">Simulate Payment</Button>
          </div>
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
            disabled={!parseFloat(input)}
            className="h-14 rounded-xl bg-gradient-orange text-white font-bold hover:opacity-90 transition-all disabled:opacity-40"
          >
            Charge
          </button>
        </div>
      </div>
    </div>
  );
}
