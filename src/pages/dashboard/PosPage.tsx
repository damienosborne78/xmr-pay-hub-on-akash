import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { formatFiat, formatXMR, usdToXmr, PosQuickButton } from '@/lib/mock-data';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Delete, Check, Loader2, Lock, Plus, X, Tag, ShoppingBag, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function ProLock({ label = 'Pro feature' }: { label?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Lock className="w-3.5 h-3.5 text-yellow-500 shrink-0 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="bg-card border-border text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function PosPage() {
  const createInvoice = useStore(s => s.createInvoice);
  const pollInvoicePayment = useStore(s => s.pollInvoicePayment);
  const invoices = useStore(s => s.invoices);
  const merchant = useStore(s => s.merchant);
  const updateMerchant = useStore(s => s.updateMerchant);
  const isPro = merchant.plan === 'pro';
  const sym = merchant.fiatSymbol || '$';
  const cur = merchant.fiatCurrency || 'USD';

  const [input, setInput] = useState('0');
  const [activeInvoice, setActiveInvoice] = useState<{ id: string; fiatAmount: number; xmrAmount: number; subaddress: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [showAddButton, setShowAddButton] = useState(false);
  const [newBtnLabel, setNewBtnLabel] = useState('');
  const [newBtnPrice, setNewBtnPrice] = useState('');
  const [newBtnCategory, setNewBtnCategory] = useState('Products');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [holdTimer, setHoldTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const quickButtons = merchant.posQuickButtons || [];
  const categories = merchant.posCategories || ['Food', 'Drinks', 'Services', 'Products'];

  const invoice = invoices.find(i => i.id === activeInvoice?.id);
  const paid = invoice?.status === 'paid';

  useEffect(() => {
    if (!activeInvoice || paid) return;
    const interval = setInterval(() => {
      pollInvoicePayment(activeInvoice.id);
    }, 12000);
    return () => clearInterval(interval);
  }, [activeInvoice, paid, pollInvoicePayment]);

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
      toast.error((e as Error).message || 'Failed to create invoice.');
    }
    setCreating(false);
  };

  const handleNewSale = () => {
    setActiveInvoice(null);
    setInput('0');
  };

  const handleQuickButton = (btn: PosQuickButton) => {
    if (!isPro) { toast.error('Upgrade to Pro to use quick buttons'); return; }
    setInput(btn.price.toFixed(2));
  };

  const handleAddQuickButton = () => {
    if (!newBtnLabel || !newBtnPrice) return;
    const btn: PosQuickButton = {
      id: 'qb_' + Math.random().toString(36).slice(2, 6),
      label: newBtnLabel,
      price: parseFloat(newBtnPrice),
      category: newBtnCategory,
      color: ['bg-primary/20', 'bg-success/20', 'bg-warning/20', 'bg-blue-500/20'][Math.floor(Math.random() * 4)],
    };
    updateMerchant({ posQuickButtons: [...quickButtons, btn] });
    setNewBtnLabel('');
    setNewBtnPrice('');
    setShowAddButton(false);
    toast.success(`"${btn.label}" added!`);
  };

  const handleRemoveButton = (id: string) => {
    updateMerchant({ posQuickButtons: quickButtons.filter(b => b.id !== id) });
    toast.success('Button removed');
  };

  // Long-press to store current value into a button
  const handleHoldStart = (btn: PosQuickButton) => {
    if (!isPro) return;
    const timer = setTimeout(() => {
      const val = parseFloat(input);
      if (val > 0) {
        updateMerchant({
          posQuickButtons: quickButtons.map(b =>
            b.id === btn.id ? { ...b, price: val } : b
          ),
        });
        toast.success(`"${btn.label}" price updated to ${sym}${val.toFixed(2)}`);
      }
    }, 800);
    setHoldTimer(timer);
  };

  const handleHoldEnd = () => {
    if (holdTimer) { clearTimeout(holdTimer); setHoldTimer(null); }
  };

  const filteredButtons = selectedCategory === 'All'
    ? quickButtons
    : quickButtons.filter(b => b.category === selectedCategory);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

  if (paid && activeInvoice) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <Check className="w-12 h-12 text-success" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">{formatFiat(activeInvoice.fiatAmount, sym, cur)}</h2>
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
            <h2 className="text-4xl font-bold text-foreground">{formatFiat(activeInvoice.fiatAmount, sym, cur)}</h2>
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
    <div className="flex items-start justify-center min-h-[70vh] gap-6">
      {/* Quick Buttons Panel — Pro */}
      <div className="hidden lg:block w-64 space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Quick Items</span>
            {!isPro && <ProLock label="Unlock Pro Sub for quick items" />}
          </div>
          {isPro && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddButton(true)} className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-1 flex-wrap">
          {['All', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => isPro && setSelectedCategory(cat)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                selectedCategory === cat
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-border/80'
              } ${!isPro ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick button grid */}
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {filteredButtons.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {isPro ? 'No items yet. Click + to add.' : 'Upgrade to Pro to add quick items.'}
            </p>
          )}
          {filteredButtons.map(btn => (
            <div
              key={btn.id}
              className={`group relative flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                isPro
                  ? 'border-border bg-card hover:border-primary/30 active:scale-[0.98]'
                  : 'border-border bg-card opacity-50 cursor-not-allowed'
              }`}
              onClick={() => handleQuickButton(btn)}
              onMouseDown={() => handleHoldStart(btn)}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={() => handleHoldStart(btn)}
              onTouchEnd={handleHoldEnd}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3 h-3 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{btn.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-primary">{sym}{btn.price.toFixed(2)}</span>
                {isPro && (
                  <button
                    onClick={e => { e.stopPropagation(); handleRemoveButton(btn.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {isPro && quickButtons.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center">Hold a button to update its price from the keypad</p>
        )}
      </div>

      {/* Main Keypad */}
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <Badge variant="outline" className="mb-4 text-primary border-primary/20">PoS Mode</Badge>
          <div className="text-5xl font-bold text-foreground tracking-tight tabular-nums">
            {sym}{input}
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

        {/* Mobile quick buttons */}
        <div className="lg:hidden">
          {quickButtons.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Quick Items</span>
                {!isPro && <ProLock label="Unlock Pro Sub for quick items" />}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {quickButtons.slice(0, 8).map(btn => (
                  <button
                    key={btn.id}
                    onClick={() => handleQuickButton(btn)}
                    className={`shrink-0 px-3 py-2 rounded-lg border text-xs transition-all ${
                      isPro ? 'border-border bg-card hover:border-primary/30 active:scale-95' : 'border-border bg-card opacity-50'
                    }`}
                  >
                    <span className="text-foreground font-medium">{btn.label}</span>
                    <span className="text-primary font-mono ml-1">{sym}{btn.price.toFixed(2)}</span>
                  </button>
                ))}
                {isPro && (
                  <button
                    onClick={() => setShowAddButton(true)}
                    className="shrink-0 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/30 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Quick Button Dialog */}
      <Dialog open={showAddButton} onOpenChange={setShowAddButton}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground">Add Quick Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-foreground font-medium">Item Name</label>
              <Input value={newBtnLabel} onChange={e => setNewBtnLabel(e.target.value)} className="bg-background border-border" placeholder="e.g. Coffee" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-foreground font-medium">Price ({cur})</label>
              <Input type="number" value={newBtnPrice} onChange={e => setNewBtnPrice(e.target.value)} className="bg-background border-border font-mono" placeholder="4.50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-foreground font-medium">Category</label>
              <Select value={newBtnCategory} onValueChange={setNewBtnCategory}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddQuickButton} className="w-full bg-gradient-orange hover:opacity-90" disabled={!newBtnLabel || !newBtnPrice}>
              Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
