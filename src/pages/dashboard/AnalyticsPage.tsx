import { useStore } from '@/lib/store';
import { formatUSD, formatXMR, XMR_USD_RATE } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { MoneroLogo } from '@/components/BrandLogo';
import { TrendingUp, TrendingDown, DollarSign, Shield, ArrowDownToLine, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { FadeIn } from '@/components/FadeIn';
import { useMemo } from 'react';

export default function AnalyticsPage() {
  const invoices = useStore(s => s.invoices);
  const merchant = useStore(s => s.merchant);
  const paid = invoices.filter(i => i.status === 'paid');
  const totalUSD = paid.reduce((s, i) => s + i.fiatAmount, 0);
  const totalXMR = paid.reduce((s, i) => s + i.xmrAmount, 0);
  const hedgedUSD = totalUSD * (merchant.fiatHedgePercent / 100);
  const exposedUSD = totalUSD - hedgedUSD;

  // Build revenue data from real invoices
  const revenueData = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; txCount: number }>();
    paid.forEach(inv => {
      const d = new Date(inv.paidAt || inv.createdAt);
      const key = d.toLocaleString('default', { month: 'short' });
      const existing = monthMap.get(key) || { revenue: 0, txCount: 0 };
      monthMap.set(key, { revenue: existing.revenue + inv.fiatAmount, txCount: existing.txCount + 1 });
    });
    return Array.from(monthMap.entries()).map(([month, data]) => ({ month, ...data }));
  }, [paid]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Analytics & Hedging</h1>
        </div>
        <p className="text-muted-foreground text-sm">Revenue tracking, XMR price monitoring, and fiat hedging overview</p>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatUSD(totalUSD), sub: formatXMR(totalXMR), icon: DollarSign, color: 'text-primary' },
          { label: 'XMR Price', value: formatUSD(XMR_USD_RATE), sub: 'current rate', icon: TrendingUp, color: 'text-success' },
          { label: 'Hedged', value: formatUSD(hedgedUSD), sub: `${merchant.fiatHedgePercent}% auto-converted`, icon: Shield, color: 'text-primary' },
          { label: 'XMR Exposure', value: formatUSD(exposedUSD), sub: 'held in XMR', icon: ArrowDownToLine, color: 'text-warning' },
        ].map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.05}>
            <div className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-muted-foreground text-xs mt-1">{s.sub}</p>
            </div>
          </FadeIn>
        ))}
      </div>

      {revenueData.length > 0 ? (
        <FadeIn delay={0.2}>
          <div className="p-6 rounded-xl bg-card border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Revenue by Month</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: 'hsl(240, 10%, 7%)', border: '1px solid hsl(240, 5%, 17%)', borderRadius: '8px', color: '#fff' }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(24, 100%, 50%)" strokeWidth={2} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.2}>
          <div className="p-12 rounded-xl bg-card border border-border text-center">
            <p className="text-muted-foreground">No paid invoices yet. Revenue charts will appear once payments are received.</p>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
