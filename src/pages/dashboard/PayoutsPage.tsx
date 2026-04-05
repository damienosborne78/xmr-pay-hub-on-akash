import { FadeIn } from '@/components/FadeIn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useStore } from '@/lib/store';
import { formatUSD, formatXMR, XMR_USD_RATE } from '@/lib/mock-data';
import { Landmark, FileSpreadsheet, Download, TrendingUp, ArrowRight, Calendar, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const mockPayouts = [
  { id: 'po_001', date: '2025-03-28', xmrAmount: 2.45, fiatAmount: 410.18, method: 'Bank Transfer', status: 'completed' },
  { id: 'po_002', date: '2025-03-15', xmrAmount: 1.82, fiatAmount: 304.71, method: 'Bank Transfer', status: 'completed' },
  { id: 'po_003', date: '2025-03-01', xmrAmount: 3.10, fiatAmount: 519.00, method: 'Stablecoin (USDT)', status: 'completed' },
  { id: 'po_004', date: '2025-02-15', xmrAmount: 0.95, fiatAmount: 159.05, method: 'Bank Transfer', status: 'completed' },
];

const exportFormats = [
  { id: 'csv', name: 'CSV', desc: 'Universal spreadsheet format' },
  { id: 'quickbooks', name: 'QuickBooks (IIF)', desc: 'Import directly into QuickBooks' },
  { id: 'xero', name: 'Xero (CSV)', desc: 'Xero-compatible transaction export' },
  { id: 'pdf', name: 'PDF Report', desc: 'Monthly reconciliation report' },
];

export default function PayoutsPage() {
  const merchant = useStore(s => s.merchant);
  const invoices = useStore(s => s.invoices);
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('bank');
  const [payoutThreshold, setPayoutThreshold] = useState(1.0);
  const [bankAccount, setBankAccount] = useState('');
  const [payoutCurrency, setPayoutCurrency] = useState('USD');
  const [exportRange, setExportRange] = useState('month');

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalXmr = paidInvoices.reduce((sum, i) => sum + i.xmrAmount, 0);
  const totalFiat = paidInvoices.reduce((sum, i) => sum + i.fiatAmount, 0);
  const totalPayouts = mockPayouts.reduce((sum, p) => sum + p.fiatAmount, 0);

  const handleExport = (format: string) => {
    toast.success(`Exporting ${exportRange === 'month' ? 'this month' : exportRange === 'quarter' ? 'this quarter' : 'all time'} transactions as ${format.toUpperCase()}...`);
    setTimeout(() => toast.success('Export ready! Check your downloads.'), 1500);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <FadeIn>
        <h1 className="text-2xl font-bold text-foreground">Payouts & Accounting</h1>
        <p className="text-muted-foreground text-sm">Fiat payouts, bank settlements, and accounting exports</p>
      </FadeIn>

      {/* Summary Cards */}
      <FadeIn delay={0.05}>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-5 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Total Received</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatXMR(totalXmr)}</p>
            <p className="text-sm text-muted-foreground">{formatUSD(totalFiat)}</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Total Paid Out</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatUSD(totalPayouts)}</p>
            <p className="text-sm text-muted-foreground">{mockPayouts.length} payouts</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-bold text-primary mt-1">{formatUSD(totalFiat - totalPayouts)}</p>
            <p className="text-sm text-muted-foreground">{formatXMR(totalXmr - mockPayouts.reduce((s, p) => s + p.xmrAmount, 0))}</p>
          </div>
        </div>
      </FadeIn>

      {/* Auto Payout */}
      <FadeIn delay={0.08}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Automatic Fiat Payouts</h2>
          </div>
          <p className="text-xs text-muted-foreground">Auto-convert XMR to fiat and settle to your bank account or stablecoin wallet via partner rails (BVNK, Triple-A).</p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Auto Payouts</p>
              <p className="text-xs text-muted-foreground">Automatically convert and settle when balance exceeds threshold</p>
            </div>
            <Switch checked={autoPayoutEnabled} onCheckedChange={setAutoPayoutEnabled} />
          </div>

          {autoPayoutEnabled && (
            <div className="space-y-4 pt-3 border-t border-border">
              <div className="space-y-2">
                <Label className="text-foreground">Payout Method</Label>
                <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer (ACH/SEPA/Wire)</SelectItem>
                    <SelectItem value="usdt">Stablecoin (USDT/USDC)</SelectItem>
                    <SelectItem value="usdc_polygon">USDC on Polygon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Payout Currency</Label>
                  <Select value={payoutCurrency} onValueChange={setPayoutCurrency}>
                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                      <SelectItem value="GBP">GBP — British Pound</SelectItem>
                      <SelectItem value="BRL">BRL — Brazilian Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">Payout Threshold</Label>
                    <span className="text-sm font-mono text-primary">{payoutThreshold} XMR</span>
                  </div>
                  <Slider value={[payoutThreshold]} onValueChange={v => setPayoutThreshold(v[0])} min={0.1} max={10} step={0.1} className="py-2" />
                </div>
              </div>

              {payoutMethod === 'bank' && (
                <div className="space-y-2">
                  <Label className="text-foreground">Bank Account / IBAN</Label>
                  <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="bg-background border-border font-mono text-sm" placeholder="DE89 3704 0044 0532 0130 00" />
                </div>
              )}

              <Button className="bg-gradient-orange hover:opacity-90" onClick={() => toast.success('Payout settings saved!')}>
                Save Payout Settings
              </Button>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Payout History */}
      <FadeIn delay={0.1}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Payout History</h2>
            </div>
            <Badge variant="outline" className="text-muted-foreground">{mockPayouts.length} payouts</Badge>
          </div>
          <div className="space-y-2">
            {mockPayouts.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatUSD(p.fiatAmount)}</p>
                    <p className="text-xs text-muted-foreground">{p.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-primary">{formatXMR(p.xmrAmount)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Accounting Export */}
      <FadeIn delay={0.12}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Accounting Export</h2>
          </div>
          <p className="text-xs text-muted-foreground">Export transactions with cost basis for tax reporting. Includes fiat equivalent at time of payment.</p>

          <div className="space-y-2">
            <Label className="text-foreground">Export Range</Label>
            <Select value={exportRange} onValueChange={setExportRange}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {exportFormats.map(fmt => (
              <button
                key={fmt.id}
                onClick={() => handleExport(fmt.id)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 bg-muted/10 transition-colors text-left"
              >
                <Download className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{fmt.name}</p>
                  <p className="text-xs text-muted-foreground">{fmt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Monthly Reconciliation */}
      <FadeIn delay={0.15}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Monthly Reconciliation</h2>
          </div>
          <p className="text-xs text-muted-foreground">Auto-generated monthly summary with all transactions, conversions, payouts, and tax-ready figures.</p>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">March 2025 Report</p>
              <p className="text-xs text-muted-foreground">32 transactions • {formatUSD(1233.89)} revenue • {formatXMR(7.37)} received</p>
            </div>
            <Button variant="outline" size="sm" className="border-border hover:border-primary/50" onClick={() => { toast.success('Generating PDF report...'); setTimeout(() => toast.success('Report ready!'), 1500); }}>
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">February 2025 Report</p>
              <p className="text-xs text-muted-foreground">18 transactions • {formatUSD(567.20)} revenue • {formatXMR(3.39)} received</p>
            </div>
            <Button variant="outline" size="sm" className="border-border hover:border-primary/50" onClick={() => toast.success('Downloading...')}>
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
