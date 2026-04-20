'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { formatFiat } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FadeIn } from '@/components/FadeIn';
import { HelpTooltip } from '@/components/HelpTooltip';
import { Plus, Copy, Trash2, ExternalLink, Upload, Power, PowerOff, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

export default function PaymentLinksPage() {
  const createPaymentLink = useStore((state) => state.createPaymentLink);
  const deletePaymentLink = useStore((state) => state.deletePaymentLink);
  const togglePaymentLink = useStore((state) => state.togglePaymentLink);
  const importFromPos = useStore((state) => state.importFromPos);
  const paymentLinks = useStore((state) => state.paymentLinks) || [];
  const posInventory = useStore((state) => state.merchant.posQuickButtons) || [];

  const merchant = useStore((state) => state.merchant) || {};
  const sym = merchant.fiatSymbol ?? '$';
  const cur = merchant.fiatCurrency ?? 'USD';
  const fqdn = merchant.fqdn ?? '';
  const payoutAddress = merchant.viewOnlyAddress ?? merchant.settlementAddress ?? merchant.primarySubaddress ?? '';

  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [chainType, setChainType] = useState<'xmr' | 'trx'>('xmr');
  const [importing, setImporting] = useState(false);

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return fqdn ? `https://${fqdn}` : window.location.origin;
  }, [fqdn]);

  const buildPayUrl = (link) => {
    const url = new URL(`${baseUrl}/pay/${link.uniqueId}/${link.fiatAmount}/${link.slug}`);
    if (payoutAddress) {
      url.searchParams.set('address', payoutAddress);
    }
    url.searchParams.set('currency', link.fiatCurrency || cur);
    url.searchParams.set('symbol', sym);
    url.searchParams.set('chain', link.chainType || 'xmr');
    return url.toString();
  };

  const handleCreate = async () => {
    if (!label || Number.isNaN(Number(amount))) {
      return;
    }
    if (!payoutAddress) {
      toast.error('Add a wallet receiving address first in Settings → Wallet & Node.');
      return;
    }
    try {
      const userSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]/g, '-') : label.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      
      // Generate BOTH XMR and USDT payment links
      await createPaymentLink(userSlug, Number(amount), label, cur, undefined, 'xmr');
      await createPaymentLink(userSlug, Number(amount), label, cur, undefined, 'trx');
      
      toast.success('Both XMR and USDT payment links created!');
      setOpen(false);
      setSlug('');
      setAmount('');
      setLabel('');
      setDescription('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to create payment links';
      toast.error(message);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const importedCount = await importFromPos();
      toast.success(`Imported ${importedCount} items from POS!`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to import from POS';
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const copyLink = async (link) => {
    const fullUrl = buildPayUrl(link);
    try {
      // Try modern clipboard API first
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
        toast.success('Payment link copied to clipboard!');
        return;
      }

      // Fallback to execCommand for non-secure contexts
      if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (success) {
          toast.success('Payment link copied to clipboard!');
        } else {
          throw new Error('execCommand copy failed');
        }
        return;
      }

      toast.error('Clipboard not available');
    } catch (e) {
      console.error('Failed to copy link:', e);
      toast.error('Failed to copy link. Please select and copy the URL manually.');
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Payment Links
              <HelpTooltip
                title="Payment Links"
                text="Create reusable payment links for products. Each link has a unique QR code that customers can scan to pay multiple times. Perfect for online shops with persistent checkout buttons."
              />
            </h1>
            <p className="text-muted-foreground text-sm">Reusable links with QR codes for multiple payments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImport} disabled={importing}>
              <Upload className="w-4 h-4 mr-2" />
              Import from POS
              <HelpTooltip
                title="Import from POS"
                text="Import all your POS inventory items as payment links. Each product gets a reusable URL and QR code based on its label and price."
              />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-orange hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> New Link</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-foreground">Create Payment Link</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label className="text-foreground">Product Name</Label>
                    <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="T-Shirt" className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Premium cotton t-shirt" className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Price ({cur})</Label>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="29.99" className="bg-background border-border" />
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm font-medium">Monero (XMR) + TRON (USDT)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This will create two separate payment links — one for Monero and one for USDT on the TRON network.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">URL Slug</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs font-mono truncate max-w-[160px]">{baseUrl}/pay/$/</span>
                      <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="t-shirt" className="bg-background border-border font-mono text-sm" />
                    </div>
                  </div>
                  <Button onClick={handleCreate} className="w-full bg-gradient-orange hover:opacity-90">Create Link</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {paymentLinks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No payment links yet. Create one manually or click "Import from POS" to auto-generate from your inventory.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {paymentLinks.map((link) => (
                <FadeIn key={link.id} delay={0.06}>
                  <div className="p-6 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground truncate">{link.label}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => togglePaymentLink(link.id)}
                          >
                            {link.active ? <Power className="w-4 h-4 text-success" /> : <PowerOff className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                          {!link.active && <span className="text-xs text-muted-foreground">(inactive)</span>}
                        </div>
                        {link.description && (
                          <p className="text-sm text-muted-foreground mb-3">{link.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-foreground font-semibold">{formatFiat(link.fiatAmount, sym, cur)}</span>
                          <span className="text-muted-foreground">{link.fiatCurrency}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{link.totalUses} uses</span>
                        </div>
                        <div className="mt-3">
                          <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
                            {buildPayUrl(link)}
                          </code>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => copyLink(link)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.open(buildPayUrl(link), '_blank');
                          }
                        }} className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (confirm('Delete this payment link?')) {
                            deletePaymentLink(link.id);
                            toast.success('Link deleted');
                          }
                        }} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
