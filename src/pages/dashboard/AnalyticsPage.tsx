import { useStore } from '@/lib/store';
import { formatUSD, formatXMR, XMR_USD_RATE, mockRevenueData, mockPriceHistory } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { MoneroLogo } from '@/components/BrandLogo';
import { TrendingUp, TrendingDown, FileText, Clock, DollarSign, Shield, ArrowDownToLine, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import { FadeIn } from '@/components/FadeIn';

export default function AnalyticsPage() {
  const invoices = useStore(s => s.invoices);
  const merchant = useStore(s => s.merchant);
  const paid = invoices.filter(i => i.status === 'paid');
  const totalUSD = paid.reduce((s, i) => s + i.fiatAmount, 0);
  const totalXMR = paid.reduce((s, i) => s + i.xmrAmount, 0);
  const hedgedUSD = totalUSD * (merchant.fiatHedgePercent / 100);
  const exposedUSD = totalUSD - hedgedUSD;

  const priceChange = mockPriceHistory[mockPriceHistory.length - 1].price - mockPriceHistory[0].price;
  const priceChangePercent = ((priceChange / mockPriceHistory[0].price) * 100).toFixed(2);
  const isUp = priceChange >= 0;

  const pnlData = mockRevenueData.map(d => ({
    month: d.month,
    revenue: d.revenue,
    xmrValue: (d.revenue / d.xmrPrice) * XMR_USD_RATE,
    pnl: ((d.revenue / d.xmrPrice) * XMR_USD_RATE) - d.revenue,
  }));

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
          { label: 'XMR Price', value: formatUSD(XMR_USD_RATE), sub: `${isUp ? '+' : ''}${priceChangePercent}% today`, icon: isUp ? TrendingUp : TrendingDown, color: isUp ? 'text-success' : 'text-destructive' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.2}>
          <div className="p-6 rounded-xl bg-card border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">XMR Price (24h)</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockPriceHistory}>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 11 }} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: 'hsl(240, 10%, 7%)', border: '1px solid hsl(240, 5%, 17%)', borderRadius: '8px', color: '#fff' }} />
                  <Line type="monotone" dataKey="price" stroke={isUp ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div className="p-6 rounded-xl bg-card border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Profit / Loss (XMR holding)</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlData}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: 'hsl(240, 10%, 7%)', border: '1px solid hsl(240, 5%, 17%)', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="pnl" fill="hsl(24, 100%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.3}>
        <div className="p-6 rounded-xl bg-card border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Revenue (6 months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockRevenueData}>
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
    </div>
  );
}
