import { useStore } from '@/lib/store';
import { formatXMR, formatFiat } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/FadeIn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { SendXmrDialog } from '@/components/SendXmrDialog';

export default function PaymentsPage() {
  const invoices = useStore(s => s.invoices);
  const merchant = useStore(s => s.merchant);
  const sym = merchant.fiatSymbol || '$';
  const cur = merchant.fiatCurrency || 'USD';
  const users = merchant.posUsers || [];
  const paid = invoices.filter(i => i.status === 'paid');
  const [filterUser, setFilterUser] = useState('all');
  const [showSendDialog, setShowSendDialog] = useState(false);

  const filteredPaid = filterUser === 'all'
    ? paid
    : paid.filter(i => (i.createdBy || 'admin') === filterUser);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
            <p className="text-muted-foreground text-sm">All confirmed XMR payments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowSendDialog(true)}
              className="bg-gradient-orange hover:opacity-90 gap-2"
            >
              <Send className="w-4 h-4" />
              Send XMR
            </Button>
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
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {filteredPaid.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No payments yet. Create an invoice and simulate a payment!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Invoice</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Description</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">{cur}</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">XMR</th>
                    {users.length > 0 && <th className="text-center py-3 px-4 text-muted-foreground font-medium">User</th>}
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Paid At</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPaid.map(inv => {
                    const creatorName = inv.createdBy === 'admin' || !inv.createdBy ? 'Admin' : users.find(u => u.id === inv.createdBy)?.name || inv.createdBy;
                    return (
                      <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{inv.id}</td>
                        <td className="py-3 px-4 text-foreground">
                          {inv.description}
                          {inv.simulated && <Badge className="ml-2 bg-warning/10 text-warning border-warning/20 text-[9px]">SIM</Badge>}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-foreground">{formatFiat(inv.fiatAmount, sym, cur)}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground font-mono text-xs">{formatXMR(inv.xmrAmount)}</td>
                        {users.length > 0 && <td className="py-3 px-4 text-center text-xs text-muted-foreground">{creatorName}</td>}
                        <td className="py-3 px-4 text-muted-foreground text-xs">{inv.paidAt ? new Date(inv.paidAt).toLocaleString() : '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className="bg-success/10 text-success border-success/20">confirmed</Badge>
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

      <SendXmrDialog open={showSendDialog} onOpenChange={setShowSendDialog} />
    </div>
  );
}
