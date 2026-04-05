import { useStore } from '@/lib/store';
import { formatXMR, formatUSD, XMR_USD_RATE } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { MoneroLogo } from '@/components/BrandLogo';
import { TrendingUp, FileText, Clock, DollarSign, Server, Wifi, WifiOff, Activity, Loader2, RefreshCw, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FadeIn } from '@/components/FadeIn';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function DashboardOverview() {
  const invoices = useStore(s => s.invoices);
  const merchant = useStore(s => s.merchant);
  const autoConnectNode = useStore(s => s.autoConnectNode);
  const refreshNodeStatus = useStore(s => s.refreshNodeStatus);
  const paid = invoices.filter(i => i.status === 'paid');
  const totalUSD = paid.reduce((s, i) => s + i.fiatAmount, 0);
  const totalXMR = paid.reduce((s, i) => s + i.xmrAmount, 0);
  const pending = invoices.filter(i => i.status === 'pending').length;

  const [refreshing, setRefreshing] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);

  // Auto-connect on mount if wallet is configured but not connected
  useEffect(() => {
    const shouldAutoConnect =
      (merchant.walletMode === 'viewonly' && merchant.viewOnlySetupComplete) ||
      merchant.walletMode === 'remote';

    if (shouldAutoConnect && merchant.nodeStatus !== 'online') {
      setAutoConnecting(true);
      autoConnectNode().finally(() => setAutoConnecting(false));
    }
  }, []); // Only on mount

  // Periodic health check every 60s
  useEffect(() => {
    if (merchant.nodeStatus !== 'online' && merchant.nodeStatus !== 'syncing') return;
    const interval = setInterval(() => {
      refreshNodeStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, [merchant.nodeStatus]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNodeStatus();
    setRefreshing(false);
  }, [refreshNodeStatus]);

  const handleReconnect = useCallback(async () => {
    setAutoConnecting(true);
    await autoConnectNode();
    setAutoConnecting(false);
  }, [autoConnectNode]);

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

  const stats = [
    { label: 'Total Received', value: formatUSD(totalUSD), sub: formatXMR(totalXMR), icon: DollarSign, color: 'text-primary' },
    { label: 'XMR Rate', value: formatUSD(XMR_USD_RATE), sub: '1 XMR', icon: TrendingUp, color: 'text-primary' },
    { label: 'Total Invoices', value: invoices.length.toString(), sub: `${paid.length} paid`, icon: FileText, color: 'text-primary' },
    { label: 'Pending', value: pending.toString(), sub: 'awaiting payment', icon: Clock, color: 'text-warning' },
  ];

  const nodeStatus = merchant.nodeStatus;
  const isConnected = nodeStatus === 'online' || nodeStatus === 'syncing';
  const isLoading = autoConnecting || refreshing || nodeStatus === 'connecting';

  const statusConfig = {
    online: { label: 'Online & Synced', color: 'bg-success/10 text-success border-success/20', icon: Wifi, dot: 'bg-success' },
    syncing: { label: 'Syncing...', color: 'bg-warning/10 text-warning border-warning/20', icon: Activity, dot: 'bg-warning' },
    connecting: { label: 'Connecting...', color: 'bg-primary/10 text-primary border-primary/20', icon: Loader2, dot: 'bg-primary' },
    offline: { label: 'Offline', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: WifiOff, dot: 'bg-destructive' },
  };

  const currentStatus = statusConfig[nodeStatus] || statusConfig.offline;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <MoneroLogo size={28} />
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your MoneroFlow merchant overview</p>
      </FadeIn>

      {/* Wallet Status Widget */}
      <FadeIn delay={0.02}>
        <div className={`p-5 rounded-xl border transition-colors ${
          isConnected ? 'bg-card border-success/20' :
          nodeStatus === 'connecting' ? 'bg-card border-primary/20' :
          'bg-card border-destructive/20'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`relative p-2 rounded-lg ${isConnected ? 'bg-success/10' : 'bg-muted'}`}>
                <Server className={`w-4 h-4 ${isConnected ? 'text-success' : 'text-muted-foreground'}`} />
                {isConnected && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Wallet Status</span>
                  <Badge variant="outline" className={`${currentStatus.color} text-[10px] gap-1`}>
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <StatusIcon className="w-3 h-3" />
                    )}
                    {isLoading ? 'Connecting...' : currentStatus.label}
                  </Badge>
                </div>
                {isConnected && merchant.connectedNodeLabel && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Connected to <span className="text-foreground font-medium">{merchant.connectedNodeLabel}</span>
                    {merchant.nodeLatencyMs > 0 && (
                      <span className="text-muted-foreground"> · {merchant.nodeLatencyMs}ms</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isConnected && !isLoading && (
                <Button variant="outline" size="sm" onClick={handleReconnect} className="text-xs border-border hover:border-primary/50 h-8 gap-1.5">
                  <Zap className="w-3 h-3" /> Reconnect
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading} className="text-muted-foreground hover:text-primary h-8 w-8 p-0">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {isConnected && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-border/50">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Network</p>
                <p className="text-sm text-success font-medium mt-0.5">Mainnet ✓</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Block Height</p>
                <p className="text-sm font-mono text-foreground mt-0.5">{merchant.nodeHeight.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mode</p>
                <p className="text-sm text-foreground mt-0.5 capitalize">{
                  merchant.walletMode === 'viewonly' ? 'Browser Wallet' :
                  merchant.walletMode === 'remote' ? 'Remote Node' :
                  merchant.walletMode === 'selfcustody' ? 'Self-Custody' : 'Managed'
                }</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Node</p>
                <p className="text-sm font-mono text-muted-foreground mt-0.5 truncate">{merchant.connectedNodeUrl}</p>
              </div>
            </div>
          )}

          {!isConnected && !isLoading && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {merchant.walletMode === 'viewonly' && !merchant.viewOnlySetupComplete
                  ? 'Set up your browser wallet in Settings → Wallet & Node to get started.'
                  : 'Could not connect to any remote node. Click Reconnect to try again, or switch nodes in Settings.'}
              </p>
            </div>
          )}
        </div>
      </FadeIn>

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

      {revenueData.length > 0 && (
        <FadeIn delay={0.25}>
          <div className="p-6 rounded-xl bg-card border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Revenue</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
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
      )}

      <FadeIn delay={0.3}>
        <div className="p-6 rounded-xl bg-card border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Invoices</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No invoices yet. Create one from the Invoices page.</p>
          ) : (
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
          )}
        </div>
      </FadeIn>
    </div>
  );
}
