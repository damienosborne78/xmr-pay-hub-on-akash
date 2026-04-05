import { useStore } from '@/lib/store';
import { formatXMR, formatUSD, XMR_USD_RATE, mockRevenueData } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { MoneroLogo } from '@/components/BrandLogo';
import { TrendingUp, FileText, Clock, DollarSign, Server, Wifi, WifiOff, Activity, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FadeIn } from '@/components/FadeIn';
import { getNodeHealth, getBalance, piconeroToXmr, type NodeHealth } from '@/lib/monero-rpc';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function DashboardOverview() {
  const invoices = useStore(s => s.invoices);
  const merchant = useStore(s => s.merchant);
  const paid = invoices.filter(i => i.status === 'paid');
  const totalUSD = paid.reduce((s, i) => s + i.fiatAmount, 0);
  const totalXMR = paid.reduce((s, i) => s + i.xmrAmount, 0);
  const pending = invoices.filter(i => i.status === 'pending').length;

  const [nodeHealth, setNodeHealth] = useState<NodeHealth | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const rpcConfig = {
    endpoint: merchant.rpcEndpoint,
    username: merchant.rpcUsername,
    password: merchant.rpcPassword,
    walletFilename: merchant.rpcWalletFilename,
  };

  const refreshNodeStatus = async () => {
    setLoading(true);
    try {
      const [health, bal] = await Promise.all([
        getNodeHealth(rpcConfig),
        getBalance(rpcConfig),
      ]);
      setNodeHealth(health);
      setWalletBalance(piconeroToXmr(bal.unlockedBalance));
    } catch {
      setNodeHealth(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (merchant.nativeRpcEnabled) refreshNodeStatus();
  }, [merchant.nativeRpcEnabled]);

  const formatUptime = (secs: number) => {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    return `${d}d ${h}h`;
  };

  const stats = [
    { label: 'Total Received', value: formatUSD(totalUSD), sub: formatXMR(totalXMR), icon: DollarSign, color: 'text-primary' },
    { label: 'XMR Rate', value: formatUSD(XMR_USD_RATE), sub: '1 XMR', icon: TrendingUp, color: 'text-primary' },
    { label: 'Total Invoices', value: invoices.length.toString(), sub: `${paid.length} paid`, icon: FileText, color: 'text-primary' },
    { label: 'Pending', value: pending.toString(), sub: 'awaiting payment', icon: Clock, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <MoneroLogo size={28} />
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your MoneroFlow merchant overview</p>
      </FadeIn>

      {/* Node Health & Wallet Sync Widget */}
      {merchant.nativeRpcEnabled && (
        <FadeIn delay={0.02}>
          <div className={`p-5 rounded-xl border ${nodeHealth?.status === 'synced' ? 'bg-card border-success/20' : 'bg-card border-border'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Node Health</span>
                {nodeHealth ? (
                  <Badge variant="outline" className={
                    nodeHealth.status === 'synced' ? 'bg-success/10 text-success border-success/20' :
                    nodeHealth.status === 'syncing' ? 'bg-warning/10 text-warning border-warning/20' :
                    'bg-destructive/10 text-destructive border-destructive/20'
                  }>
                    {nodeHealth.status === 'synced' && <Wifi className="w-3 h-3 mr-1" />}
                    {nodeHealth.status === 'syncing' && <Activity className="w-3 h-3 mr-1" />}
                    {nodeHealth.status === 'offline' && <WifiOff className="w-3 h-3 mr-1" />}
                    {nodeHealth.status}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Unknown</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={refreshNodeStatus} disabled={loading} className="text-muted-foreground hover:text-primary h-8 px-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              </Button>
            </div>
            {nodeHealth && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Sync</p>
                  <div className="mt-1">
                    <Progress value={nodeHealth.syncPercent} className="h-1.5" />
                    <p className="text-xs font-mono text-foreground mt-1">{nodeHealth.syncPercent.toFixed(1)}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Block Height</p>
                  <p className="text-sm font-mono text-foreground">{nodeHealth.syncHeight.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Wallet Balance</p>
                  <p className="text-sm font-mono text-primary">{walletBalance !== null ? formatXMR(walletBalance) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="text-sm font-mono text-foreground">{formatUptime(nodeHealth.uptime)}</p>
                </div>
              </div>
            )}
            {nodeHealth && (
              <p className="text-[10px] text-muted-foreground mt-3">
                {nodeHealth.networkType} · v{nodeHealth.version} · {merchant.rpcEndpoint}
              </p>
            )}
          </div>
        </FadeIn>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.05 + 0.05}>
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

      <FadeIn delay={0.25}>
        <div className="p-6 rounded-xl bg-card border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Revenue (6 months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockRevenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(240, 5%, 55%)', fontSize: 12 }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: 'hsl(240, 10%, 7%)', border: '1px solid hsl(240, 5%, 17%)', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(24, 100%, 50%)" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.3}>
        <div className="p-6 rounded-xl bg-card border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Invoices</h2>
          <div className="space-y-3">
            {invoices.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.description}</p>
                  <p className="text-xs text-muted-foreground font-mono">{inv.id}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatUSD(inv.fiatAmount)}</p>
                    <p className="text-xs text-muted-foreground">{formatXMR(inv.xmrAmount)}</p>
                  </div>
                  <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'pending' ? 'secondary' : 'outline'}
                    className={inv.status === 'paid' ? 'bg-success/10 text-success border-success/20' : inv.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' : 'text-muted-foreground'}>
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
