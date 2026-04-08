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
import { Landmark, FileSpreadsheet, Download, TrendingUp, Calendar, Check, Lock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PayoutsPage() {
  const merchant = useStore(s => s.merchant);
  const invoices = useStore(s => s.invoices);
  const isPro = merchant.plan === 'pro';

  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('bank');
  const [payoutThreshold, setPayoutThreshold] = useState(1.0);
  const [bankAccount, setBankAccount] = useState('');
  const [payoutCurrency, setPayoutCurrency] = useState('USD');
  const [exportRange, setExportRange] = useState('month');

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalXmr = paidInvoices.reduce((sum, i) => sum + i.xmrAmount, 0);
  const totalFiat = paidInvoices.reduce((sum, i) => sum + i.fiatAmount, 0);

  // If not pro, show locked screen
  if (!isPro) {
    return (
      <div className="space-y-8 max-w-3xl">
        <FadeIn>
          <h1 className="text-2xl font-bold text-foreground">Payouts & Accounting</h1>
          <p className="text-muted-foreground text-sm">Fiat payouts, bank settlements, and accounting exports</p>
        </FadeIn>
        <FadeIn delay={0.05}>
          <div className="p-8 rounded-xl bg-card border border-border text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Pro Feature</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Payouts & Accounting is available on the Pro plan. Upgrade to access fiat settlements, accounting exports (CSV, PDF, QuickBooks, Xero), and automated monthly reconciliation reports.
            </p>
            <Button
              className="bg-gradient-orange hover:opacity-90"
              onClick={() => {
                useStore.getState().updateMerchant({ plan: 'pro' });
                toast.success('Upgraded to Pro!');
              }}
            >
              Upgrade to Pro — $29/mo
            </Button>
          </div>
        </FadeIn>
      </div>
    );
  }

  const generateCSV = (invoiceList: typeof paidInvoices): string => {
    const headers = ['Invoice ID', 'Date', 'Description', 'Fiat Amount (USD)', 'XMR Amount', 'XMR/USD Rate', 'Status', 'Subaddress', 'TX Hash', 'Paid At'];
    const rows = invoiceList.map(inv => [
      inv.id,
      inv.createdAt,
      `"${inv.description.replace(/"/g, '""')}"`,
      inv.fiatAmount.toFixed(2),
      inv.xmrAmount.toFixed(6),
      XMR_USD_RATE.toFixed(2),
      inv.status,
      inv.subaddress,
      inv.txid || '',
      inv.paidAt || '',
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const generateQuickBooksIIF = (invoiceList: typeof paidInvoices): string => {
    const lines: string[] = [];
    lines.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO');
    lines.push('!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO');
    lines.push('!ENDTRNS');
    invoiceList.forEach(inv => {
      const date = new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-US');
      lines.push(`TRNS\tPAYMENT\t${date}\tMonero Revenue\t${inv.description}\t${inv.fiatAmount.toFixed(2)}\tInv ${inv.id} - ${inv.xmrAmount.toFixed(6)} XMR`);
      lines.push(`SPL\tPAYMENT\t${date}\tAccounts Receivable\t${inv.description}\t-${inv.fiatAmount.toFixed(2)}\t`);
      lines.push('ENDTRNS');
    });
    return lines.join('\n');
  };

  const generateXeroCSV = (invoiceList: typeof paidInvoices): string => {
    const headers = ['*ContactName', '*InvoiceNumber', '*InvoiceDate', '*DueDate', 'Description', '*UnitAmount', 'AccountCode', 'TaxType', 'Currency'];
    const rows = invoiceList.map(inv => [
      `"MoneroFlow Payment"`,
      inv.id,
      new Date(inv.createdAt).toISOString().split('T')[0],
      new Date(inv.createdAt).toISOString().split('T')[0],
      `"${inv.description.replace(/"/g, '""')} (${inv.xmrAmount.toFixed(6)} XMR)"`,
      inv.fiatAmount.toFixed(2),
      '200',
      'Tax Exempt',
      'USD',
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const generatePDFContent = (invoiceList: typeof paidInvoices, range: string): string => {
    const totalXmr = invoiceList.reduce((s, i) => s + i.xmrAmount, 0);
    const totalFiat = invoiceList.reduce((s, i) => s + i.fiatAmount, 0);
    let lines: string[] = [];
    lines.push('MONEROFLOW — RECONCILIATION REPORT');
    lines.push('='.repeat(50));
    lines.push(`Period: ${range.charAt(0).toUpperCase() + range.slice(1)}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Merchant: ${merchant.name || 'MoneroFlow Merchant'}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push('-'.repeat(30));
    lines.push(`Total Transactions: ${invoiceList.length}`);
    lines.push(`Total Revenue (USD): ${formatUSD(totalFiat)}`);
    lines.push(`Total XMR Received: ${formatXMR(totalXmr)}`);
    lines.push(`Average XMR/USD Rate: ${XMR_USD_RATE.toFixed(2)}`);
    lines.push('');
    lines.push('TRANSACTIONS');
    lines.push('-'.repeat(30));
    invoiceList.forEach(inv => {
      lines.push(`${inv.id} | ${new Date(inv.createdAt).toLocaleDateString()} | ${inv.description} | ${formatUSD(inv.fiatAmount)} | ${formatXMR(inv.xmrAmount)} | ${inv.status}`);
    });
    lines.push('');
    lines.push('—— End of Report ——');
    return lines.join('\n');
  };

  const filterByRange = (range: string) => {
    const now = new Date();
    return paidInvoices.filter(inv => {
      const d = new Date(inv.paidAt || inv.createdAt);
      if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (range === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        const invQ = Math.floor(d.getMonth() / 3);
        return invQ === q && d.getFullYear() === now.getFullYear();
      }
      if (range === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: string) => {
    const filtered = filterByRange(exportRange);
    if (filtered.length === 0) {
      toast.error('No paid invoices found for the selected period.');
      return;
    }
    const rangeLabel = exportRange === 'month' ? 'monthly' : exportRange === 'quarter' ? 'quarterly' : exportRange === 'year' ? 'yearly' : 'all-time';
    const dateSuffix = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'csv':
        downloadFile(generateCSV(filtered), `moneroflow-${rangeLabel}-${dateSuffix}.csv`, 'text/csv');
        toast.success(`CSV exported — ${filtered.length} transactions`);
        break;
      case 'quickbooks':
        downloadFile(generateQuickBooksIIF(filtered), `moneroflow-${rangeLabel}-${dateSuffix}.iif`, 'text/plain');
        toast.success(`QuickBooks IIF exported — ${filtered.length} transactions`);
        break;
      case 'xero':
        downloadFile(generateXeroCSV(filtered), `moneroflow-xero-${rangeLabel}-${dateSuffix}.csv`, 'text/csv');
        toast.success(`Xero CSV exported — ${filtered.length} transactions`);
        break;
      case 'pdf':
        downloadFile(generatePDFContent(filtered, rangeLabel), `moneroflow-report-${rangeLabel}-${dateSuffix}.txt`, 'text/plain');
        toast.success(`Report exported — ${filtered.length} transactions`);
        break;
    }
  };

  const exportFormats = [
    { id: 'csv', name: 'CSV', desc: 'Universal spreadsheet format' },
    { id: 'quickbooks', name: 'QuickBooks (IIF)', desc: 'Import directly into QuickBooks' },
    { id: 'xero', name: 'Xero (CSV)', desc: 'Xero-compatible transaction export' },
    { id: 'pdf', name: 'PDF Report', desc: 'Reconciliation report (text)' },
  ];

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
            <p className="text-xs text-muted-foreground">Paid Invoices</p>
            <p className="text-2xl font-bold text-foreground mt-1">{paidInvoices.length}</p>
            <p className="text-sm text-muted-foreground">transactions</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">XMR/USD Rate</p>
            <p className="text-2xl font-bold text-primary mt-1">${XMR_USD_RATE.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">current rate</p>
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
          <p className="text-xs text-muted-foreground">Auto-convert XMR to fiat and settle to your bank account or stablecoin wallet via partner rails.</p>

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
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
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

      {/* Accounting Export */}
      <FadeIn delay={0.1}>
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
      <FadeIn delay={0.12}>
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recent Paid Invoices</h2>
          </div>
          <p className="text-xs text-muted-foreground">Your most recent paid transactions.</p>

          {paidInvoices.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/20 border border-border text-center">
              <p className="text-sm text-muted-foreground">No paid invoices yet. Paid invoices will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paidInvoices.slice(0, 10).map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatUSD(inv.fiatAmount)}</p>
                      <p className="text-xs text-muted-foreground">{inv.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-primary">{formatXMR(inv.xmrAmount)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(inv.paidAt || inv.createdAt).toLocaleDateString()}</p>
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
