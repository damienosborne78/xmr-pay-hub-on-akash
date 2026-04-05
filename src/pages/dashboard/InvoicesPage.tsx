import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { formatXMR, formatUSD } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ExternalLink, FileDown, Loader2 } from 'lucide-react';
import { FadeIn } from '@/components/FadeIn';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const invoices = useStore(s => s.invoices);
  const createInvoice = useStore(s => s.createInvoice);
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!desc || !amount || isNaN(Number(amount))) return;
    setCreating(true);
    try {
      const inv = await createInvoice(desc, Number(amount));
      toast.success(`Invoice ${inv.id} created!`);
      setOpen(false);
      setDesc('');
      setAmount('');
    } catch (e) {
      toast.error((e as Error).message || 'Failed to create invoice');
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground text-sm">Create and manage payment invoices</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-orange hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="text-foreground">Create Invoice</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Description</Label>
                  <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Pro Subscription" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Amount (USD)</Label>
                  <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="49.99" className="bg-background border-border" />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full bg-gradient-orange hover:opacity-90">
                  {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {creating ? 'Generating secure mainnet subaddress...' : 'Create Invoice'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No invoices yet. Create one to generate a unique Monero subaddress.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Invoice</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Description</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Amount</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">XMR</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{inv.id}</td>
                      <td className="py-3 px-4 text-foreground">{inv.description}</td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">{formatUSD(inv.fiatAmount)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground text-xs font-mono">{formatXMR(inv.xmrAmount)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline"
                          className={inv.status === 'paid' ? 'bg-success/10 text-success border-success/20' : inv.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' : 'text-muted-foreground'}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/invoice/${inv.id}`}>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8 px-2">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8 px-2" onClick={() => toast.info('PDF export coming soon!')}>
                            <FileDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
