import { useStore } from '@/lib/store';
import { formatXMR, formatUSD } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/FadeIn';

export default function PaymentsPage() {
  const invoices = useStore(s => s.invoices);
  const paid = invoices.filter(i => i.status === 'paid');

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
        <p className="text-muted-foreground text-sm">All confirmed XMR payments</p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {paid.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No payments yet. Create an invoice and simulate a payment!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Invoice</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Description</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">USD</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">XMR</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Paid At</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paid.map(inv => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{inv.id}</td>
                      <td className="py-3 px-4 text-foreground">{inv.description}</td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">{formatUSD(inv.fiatAmount)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground font-mono text-xs">{formatXMR(inv.xmrAmount)}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{inv.paidAt ? new Date(inv.paidAt).toLocaleString() : '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-success/10 text-success border-success/20">confirmed</Badge>
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
