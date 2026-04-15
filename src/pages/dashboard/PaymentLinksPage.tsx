import { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatFiat } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FadeIn } from '@/components/FadeIn';
import { HelpIcon } from '@/components/HelpIcon';
import { Plus, Copy, Trash2, ExternalLink, Link2, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentLinksPage() {
  const paymentLinks = useStore(s => s.paymentLinks);
  const createPaymentLink = useStore(s => s.createPaymentLink);
  const deletePaymentLink = useStore(s => s.deletePaymentLink);
  const merchant = useStore(s => s.merchant);
  const sym = merchant.fiatSymbol || '$';
  const cur = merchant.fiatCurrency || 'USD';
  const fqdn = merchant.fqdn || '';
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const payoutAddress = merchant.viewOnlyAddress || merchant.settlementAddress || merchant.primarySubaddress;

  const buildPayUrl = (link: typeof paymentLinks[number]) => {
    const url = new URL(`${baseUrl}/pay/${link.fiatAmount}/${encodeURIComponent(link.slug)}`);
    if (payoutAddress) url.searchParams.set('address', payoutAddress);
    url.searchParams.set('currency', link.fiatCurrency || cur);
    url.searchParams.set('symbol', sym);
    return url.toString();
  };

  const handleCreate = () => {
    if (!slug || !amount || !label || isNaN(Number(amount))) return;
    if (!payoutAddress) {
      toast.error('Add a wallet receiving address first in Settings → Wallet & Node.');
      return;
    }
    createPaymentLink(slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'), Number(amount), label, cur);
    toast.success('Payment link created!');
    setOpen(false);
    setSlug(''); setAmount(''); setLabel('');
  };

  const baseUrl = fqdn ? `https://${fqdn}` : window.location.origin;

  const copyLink = (link: typeof paymentLinks[0]) => {
    navigator.clipboard.writeText(buildPayUrl(link));
    toast.success('Link copied!');
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment Links
              <HelpIcon text="Create shareable payment links — no code required. Share a URL and customers get a Monero checkout page instantly." />
            </h1>
            <p className="text-muted-foreground text-sm">Shareable links — no code required</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-orange hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> New Link</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="text-foreground">Create Payment Link</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Label</Label>
                  <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Buy Me a Coffee" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Amount ({cur})</Label>
                  <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="4.99" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs font-mono truncate max-w-[160px]">{baseUrl}/pay/$/</span>
                    <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="coffee" className="bg-background border-border font-mono text-sm" />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full bg-gradient-orange hover:opacity-90">Create Link</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </FadeIn>

      {!fqdn && (
        <FadeIn delay={0.03}>
          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Set up your custom domain</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Go to <strong>Settings → Custom Domain (FQDN)</strong> to connect your own domain. Payment links will use it automatically.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.05}>
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Link2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Payment Links</p>
              <p className="text-xs text-muted-foreground mt-1">
                 Share simple links like <span className="font-mono text-primary">{baseUrl}/pay/49.99/coffee</span> — customers get a checkout page instantly. Embed as buttons on any website.
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="grid gap-4">
          {paymentLinks.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">No payment links yet. Create one to get started.</div>
          )}
          {paymentLinks.map(link => (
            <div key={link.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium">{link.label}</p>
                   <p className="text-primary font-mono text-sm mt-1 break-all">{buildPayUrl(link)}</p>
                  <p className="text-muted-foreground text-xs mt-1">{link.uses} uses · Created {new Date(link.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-foreground">{formatFiat(link.fiatAmount, sym, cur)}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary" onClick={() => copyLink(link)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary" onClick={() => window.open(buildPayUrl(link), '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => { deletePaymentLink(link.id); toast.info('Link deleted'); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
