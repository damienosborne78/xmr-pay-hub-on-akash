import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { formatXMR, formatFiat } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ExternalLink, FileDown, Loader2, FlaskConical } from 'lucide-react';
import { FadeIn } from '@/components/FadeIn';
import { toast } from 'sonner';
import { useRates } from '@/hooks/use-rates';
import { getXmrPrice } from '@/lib/currency-service';

export default function InvoicesPage() {
  const invoices = useStore(s => s.invoices);
  const createInvoice = useStore(s => s.createInvoice);
  const simulateInvoice = useStore(s => s.simulateInvoice);
  const merchant = useStore(s => s.merchant);
  const sym = merchant.fiatSymbol || '$';
  const cur = merchant.fiatCurrency || 'USD';
  const users = merchant.posUsers || [];
  const adminPasswordSet = !!merchant.adminPasswordHash;
  const { rates } = useRates();

  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [filterUser, setFilterUser] = useState('all');
  const [showSimulate, setShowSimulate] = useState(false);
  const [simDesc, setSimDesc] = useState('Test Payment');
  const [simAmount, setSimAmount] = useState('25');
  const [simulating, setSimulating] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminVerified, setAdminVerified] = useState(false);

  const hashPassword = (pw: string) => {
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
      const chr = pw.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  };

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

  const handleSimulate = async () => {
    if (!simDesc || !simAmount || isNaN(Number(simAmount))) return;
    setSimulating(true);
    try {
      const inv = await simulateInvoice(simDesc, Number(simAmount));
      toast.success(`Simulated payment ${inv.id} created! Check Payments tab.`);
      setShowSimulate(false);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to simulate');
    }
    setSimulating(false);
  };

  const handleVerifyAdmin = () => {
    if (hashPassword(adminPass) === merchant.adminPasswordHash) {
      setAdminVerified(true);
      setAdminPass('');
    } else {
      toast.error('Wrong admin password');
    }
  };

  const filteredInvoices = filterUser === 'all'
    ? invoices
    : invoices.filter(i => (i.createdBy || 'admin') === filterUser);

  const xmrPrice = rates ? getXmrPrice(cur, rates) : null;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground text-sm">
              Create and manage payment invoices
              {xmrPrice && <span className="ml-2 text-primary font-mono text-xs">XMR: {formatFiat(xmrPrice, sym, cur)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* User filter */}
            {users.length > 0 && (
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-[140px] h-9 bg-background border-border text-sm">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Simulate Invoice (admin only) */}
            {adminPasswordSet && adminVerified && (
              <Button variant="outline" onClick={() => setShowSimulate(true)} className="border-border hover:border-warning/50 text-warning">
                <FlaskConical className="w-4 h-4 mr-1" /> Simulate
              </Button>
            )}
            {adminPasswordSet && !adminVerified && (
              <div className="flex items-center gap-1">
                <Input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Admin pass" className="h-9 w-32 bg-background border-border text-xs" onKeyDown={e => e.key === 'Enter' && handleVerifyAdmin()} />
                <Button variant="ghost" size="sm" onClick={handleVerifyAdmin} className="text-xs text-muted-foreground">🔓</Button>
              </div>
            )}

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
                    <Label className="text-foreground">Amount ({cur})</Label>
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
        </div>
      </FadeIn>

      {/* Simulate dialog */}
      <Dialog open={showSimulate} onOpenChange={setShowSimulate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground flex items-center gap-2"><FlaskConical className="w-5 h-5 text-warning" /> Simulate Payment</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Creates a fake "paid" invoice with a simulated TX hash for testing accounting & payouts.</p>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Input value={simDesc} onChange={e => setSimDesc(e.target.value)} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Amount ({cur})</Label>
              <Input value={simAmount} onChange={e => setSimAmount(e.target.value)} type="number" min="0" step="0.01" className="bg-background border-border" />
            </div>
            <Button onClick={handleSimulate} disabled={simulating} className="w-full bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30">
              {simulating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FlaskConical className="w-4 h-4 mr-2" />}
              Create Simulated Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FadeIn delay={0.1}>
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No invoices yet. Create one to generate a unique Monero subaddress.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Invoice</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Description</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Amount ({cur})</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">XMR</th>
                    {users.length > 0 && <th className="text-center py-3 px-4 text-muted-foreground font-medium">User</th>}
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => {
                    const creatorName = inv.createdBy === 'admin' || !inv.createdBy ? 'Admin' : users.find(u => u.id === inv.createdBy)?.name || inv.createdBy;
                    return (
                      <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{inv.id}</td>
                        <td className="py-3 px-4 text-foreground">
                          {inv.description}
                          {inv.simulated && <Badge className="ml-2 bg-warning/10 text-warning border-warning/20 text-[9px]">SIMULATED</Badge>}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-foreground">{formatFiat(inv.fiatAmount, sym, cur)}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground text-xs font-mono">{formatXMR(inv.xmrAmount)}</td>
                        {users.length > 0 && <td className="py-3 px-4 text-center text-xs text-muted-foreground">{creatorName}</td>}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
