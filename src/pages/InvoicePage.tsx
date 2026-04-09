import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { formatXMR, formatFiat } from '@/lib/mock-data';
import { BrandLogo, MoneroLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Clock, Copy, AlertTriangle, Eye, FileDown, Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { FadeIn } from '@/components/FadeIn';
import { Progress } from '@/components/ui/progress';
import { validateAddress, type RpcConfig } from '@/lib/monero-rpc';
import { REMOTE_NODES } from '@/lib/node-manager';
import { MoneroFeeInfo } from '@/components/MoneroFeeInfo';
import { getCheckoutTranslation } from '@/lib/checkout-translations';

export default function InvoicePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const invoices = useStore(s => s.invoices);
  const merchant = useStore(s => s.merchant);
  const pollInvoicePayment = useStore(s => s.pollInvoicePayment);
  const invoice = invoices.find(i => i.id === id);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [copiedTxKey, setCopiedTxKey] = useState(false);
  const [polling, setPolling] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; subaddress: boolean; nettype: string } | null>(null);

  // Get translations - auto-detect browser language
  const t = useMemo(() => getCheckoutTranslation(), []);
  const sym = merchant.fiatSymbol || '$';
  const cur = merchant.fiatCurrency || 'USD';

  // Countdown timer
  useEffect(() => {
    if (!invoice || invoice.status !== 'pending') return;
    const interval = setInterval(() => {
      const diff = new Date(invoice.expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(t.expired); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [invoice, t]);

  // Poll for payment every 12 seconds
  useEffect(() => {
    if (!invoice || !id) return;
    if (invoice.status === 'paid' || invoice.status === 'expired' || invoice.status === 'overpaid') return;

    const poll = async () => {
      setPolling(true);
      try {
        await pollInvoicePayment(id);
      } catch (e) {
        console.error('Poll error:', e);
      }
      setPolling(false);
    };

    poll();
    const interval = setInterval(poll, 12000);
    return () => clearInterval(interval);
  }, [id, invoice?.status]);

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t.invoiceNotFound}</h1>
          <p className="text-muted-foreground">This invoice doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(invoice.subaddress);
    setCopied(true);
    toast.success(t.copied + '!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyTxKey = () => {
    if (!invoice.txKey) return;
    navigator.clipboard.writeText(invoice.txKey);
    setCopiedTxKey(true);
    toast.success('Transaction proof key copied!');
    setTimeout(() => setCopiedTxKey(false), 2000);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'paid': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'seen_on_chain': case 'confirming': return 'bg-primary/10 text-primary border-primary/20';
      case 'underpaid': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'overpaid': return 'bg-success/10 text-success border-success/20';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) navigate('/dashboard/invoices'); }}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <FadeIn className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <BrandLogo linkTo="/dashboard/invoices" />
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground font-mono">{invoice.id}</p>
                <p className="text-sm font-medium text-foreground mt-1">{invoice.description}</p>
                {invoice.subaddressIndex !== undefined && (
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">subaddr idx: {invoice.subaddressIndex}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {polling && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                <Badge variant="outline" className={statusColor(invoice.status)}>
                  {invoice.status === 'paid' && <Check className="w-3 h-3 mr-1" />}
                  {invoice.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                  {(invoice.status === 'seen_on_chain' || invoice.status === 'confirming') && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {(invoice.status === 'expired' || invoice.status === 'underpaid') && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {invoice.status}
                </Badge>
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{formatFiat(invoice.fiatAmount, sym, cur)}</p>
              <p className="text-primary font-mono text-sm mt-1 flex items-center justify-center gap-1">
                <MoneroLogo size={16} /> {formatXMR(invoice.xmrAmount)}
              </p>
            </div>
          </div>

          {(invoice.status === 'pending' || invoice.status === 'seen_on_chain' || invoice.status === 'confirming') && (
            <>
              <div className="p-6 flex flex-col items-center">
                <div className="bg-foreground p-3 rounded-xl mb-4">
                  <QRCodeSVG value={`monero:${invoice.subaddress}?tx_amount=${invoice.xmrAmount.toFixed(6)}`} size={180} bgColor="#fafafa" fgColor="#09090b" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">{t.sendExactly}</p>
                <p className="font-mono text-sm text-primary font-medium mb-4">{formatXMR(invoice.xmrAmount)}</p>
                <div className="w-full bg-muted/30 rounded-lg p-3 mb-3">
                  <p className="text-xs text-muted-foreground mb-1">{t.toSubaddress}</p>
                  <p className="font-mono text-[10px] text-foreground break-all leading-relaxed">{invoice.subaddress}</p>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={copyAddress} className="border-border hover:border-primary/50">
                    {copied ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
                    {copied ? t.copied : t.copyAddress}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border hover:border-primary/50"
                    disabled={validating}
                    onClick={async () => {
                      setValidating(true);
                      try {
                        const m = useStore.getState().merchant;
                        const connectedUrl = m.connectedNodeUrl || m.viewOnlyNodeUrl || REMOTE_NODES[0].url;
                        const cfg: RpcConfig = { endpoint: `https://${connectedUrl}`, username: '', password: '', walletFilename: '' };
                        const result = await validateAddress(cfg, invoice.subaddress);
                        setValidationResult(result);
                        if (result.valid && result.subaddress) {
                          toast.success(`${t.valid} ${result.nettype} subaddress`);
                        } else {
                          toast.error(t.invalid);
                        }
                      } catch {
                        const isValid = invoice.subaddress.length === 95 && invoice.subaddress.startsWith('8');
                        setValidationResult({ valid: isValid, subaddress: isValid, nettype: 'mainnet' });
                        if (isValid) toast.info('Format check passed (RPC validation unavailable)');
                        else toast.error(t.invalid);
                      }
                      setValidating(false);
                    }}
                  >
                    {validating ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : 
                     validationResult ? (validationResult.valid ? <ShieldCheck className="w-3 h-3 mr-1.5 text-success" /> : <ShieldX className="w-3 h-3 mr-1.5 text-destructive" />) :
                     <ShieldCheck className="w-3 h-3 mr-1.5" />}
                    {validationResult ? (validationResult.valid ? `✅ ${t.valid}` : `❌ ${t.invalid}`) : t.validate}
                  </Button>
                </div>
                {validationResult && (
                  <p className={`text-[10px] mb-2 ${validationResult.valid ? 'text-success' : 'text-destructive'}`}>
                    {validationResult.valid 
                      ? `✅ ${t.valid} Mainnet Subaddress (${validationResult.nettype})`
                      : `❌ ${t.invalid} — do not send funds to this address`}
                  </p>
                )}

                {invoice.status === 'confirming' && invoice.confirmations !== undefined && (
                  <div className="w-full mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{t.confirmations}</span>
                      <span className="font-mono text-foreground">{invoice.confirmations}/10</span>
                    </div>
                    <Progress value={Math.min(100, (invoice.confirmations / 10) * 100)} className="h-1.5" />
                  </div>
                )}

                {invoice.txid && (
                  <div className="w-full mt-3 bg-muted/30 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">{t.txId}</p>
                    <p className="font-mono text-[10px] text-foreground break-all">{invoice.txid}</p>
                  </div>
                )}

                {timeLeft && invoice.status === 'pending' && (
                  <p className="text-xs text-muted-foreground mt-4">{t.expiresIn} <span className="text-warning font-mono">{timeLeft}</span></p>
                )}

                {/* Network fee & speed info */}
                <div className="w-full mt-3">
                  <MoneroFeeInfo />
                </div>
              </div>
              <div className="px-6 pb-4">
                <p className="text-[10px] text-muted-foreground text-center">
                  {t.scanQrCode} · Checking every 12s via block explorer...
                </p>
              </div>
            </>
          )}

          {invoice.status === 'paid' && (
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{t.paymentConfirmed}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatXMR(invoice.xmrAmount)} received on {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : ''}
                </p>
                {invoice.confirmations !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{t.confirmations}</span>
                      <span className="font-mono text-foreground">{invoice.confirmations}/10</span>
                    </div>
                    <Progress value={Math.min(100, (invoice.confirmations / 10) * 100)} className="h-1.5" />
                  </div>
                )}
              </div>

              {invoice.txid && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-foreground">Transaction Proof</p>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">{t.txId}</p>
                    <p className="font-mono text-[10px] text-foreground break-all">{invoice.txid}</p>
                  </div>
                  {invoice.txKey && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyTxKey} className="border-border hover:border-primary/50 text-xs flex-1">
                        {copiedTxKey ? <Check className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                        {copiedTxKey ? t.copied : 'Copy TX Key (Proof)'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toast.info('Payment proof PDF export coming soon!')} className="border-border hover:border-primary/50 text-xs">
                        <FileDown className="w-3 h-3 mr-1" /> Export
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {invoice.status === 'expired' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{t.expired}</h3>
              <p className="text-sm text-muted-foreground">This invoice is no longer valid.</p>
            </div>
          )}

          {invoice.status === 'underpaid' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{t.underpaid}</h3>
              <p className="text-sm text-muted-foreground">{t.underpaid}</p>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
