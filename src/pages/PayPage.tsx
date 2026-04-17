'use client';

import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { formatUSD, formatXMR, usdToXmr, XMR_USD_RATE } from '@/lib/mock-data';
import { useStore } from '@/lib/store';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/components/ui/badge';
import { MoneroLogo } from '@/components/BrandLogo';
import { Check, Clock, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentProgress } from '@/components/PaymentProgress';
import { fiatToXmr, getRates, getStaleCache, getXmrPrice } from '@/lib/currency-service';

export default function PayPage() {
  const { uniqueId, amount, label } = useParams();
  const fiatAmount = parseFloat(amount || '0');
  const search = new URLSearchParams(window.location.search);
  const displayCurrency = (search.get('currency') || 'USD').toUpperCase();
  const displaySymbol = search.get('symbol') || (displayCurrency === 'USD' ? '$' : `${displayCurrency} `);

  const pollInvoicePayment = useStore(s => s.pollInvoicePayment);
  const createInvoice = useStore(s => s.createInvoice);
  const updateInvoice = useStore(s => s.updateInvoice);
  const invoices = useStore(s => s.invoices);
  const paymentLinks = useStore(s => s.paymentLinks);

  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [subaddress, setSubaddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(3600);
  const [copied, setCopied] = useState(false);
  const [xmrAmount, setXmrAmount] = useState(usdToXmr(fiatAmount));
  const [referenceRate, setReferenceRate] = useState(XMR_USD_RATE);

  const invoice = invoices.find(i => i.id === invoiceId);
  const paid = invoice?.status === 'paid';
  const confirming = invoice?.status === 'confirming';
  const seenOnChain = invoice?.status === 'seen_on_chain';
  const failed = (invoice?.status === 'expired' || invoice?.status === 'cancelled');

  // Find payment link by uniqueId (prevents clashes across users)
  const paymentLink = uniqueId
    ? paymentLinks.find(pl => pl.uniqueId === uniqueId)
    : null;
  const isInactivePaymentLink = paymentLink && !paymentLink.active;

  const formattedFiatAmount = `${displaySymbol}${fiatAmount.toFixed(2)}${displayCurrency === 'USD' ? '' : ` ${displayCurrency}`}`;

  // Fetch live rates
  useEffect(() => {
    let active = true;

    const loadQuote = async () => {
      try {
        const rates = await getRates();
        if (!active) return;
        setXmrAmount(fiatToXmr(fiatAmount, displayCurrency, rates));
        setReferenceRate(getXmrPrice(displayCurrency, rates));
      } catch {
        const stale = getStaleCache();
        if (stale && active) {
          setXmrAmount(fiatToXmr(fiatAmount, displayCurrency, stale));
          setReferenceRate(getXmrPrice(displayCurrency, stale));
        }
      }
    };

    if (fiatAmount > 0) loadQuote();
    return () => { active = false; };
  }, [displayCurrency, fiatAmount]);

  // Create NEW invoice on each payment link visit
  // The payment link URL stays the same, but each session gets unique subaddress/invoice
  useEffect(() => {
    if (!fiatAmount || fiatAmount <= 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const invoiceDescription = label
          ? `Payment Link: ${decodeURIComponent(label).replace(/-/g, ' ')}`
          : 'Payment Link';

        // Creates new invoice with unique subaddress (same as POS)
        const inv = await createInvoice(invoiceDescription, fiatAmount);

        // Check if cancelled before setting state
        if (cancelled) return;

        // Link invoice to payment link for analytics
        if (paymentLink?.id) {
          updateInvoice(inv.id, {
            description: invoiceDescription,
          });
        }

        setSubaddress(inv.subaddress);
        setInvoiceId(inv.id);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || 'Failed to create payment address. Check RPC connection.');
        }
      }
      if (!cancelled) {
        setLoading(false);
      }
    };

    init();

    // Cleanup function to cancel if effect re-runs
    return () => {
      cancelled = true;
    };
  }, [createInvoice, updateInvoice, fiatAmount, uniqueId, paymentLink]);

  // Poll for payment confirmation (more frequent for payment links)
  useEffect(() => {
    if (!invoiceId || paid) return;
    const interval = setInterval(() => {
      pollInvoicePayment(invoiceId);
    }, 8000);
    return () => clearInterval(interval);
  }, [invoiceId, paid]);

  // Countdown timer
  useEffect(() => {
    if (paid) return;
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [paid, timeLeft]);

  const copyAddr = () => {
    navigator.clipboard.writeText(subaddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!fiatAmount || fiatAmount <= 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">Invalid payment link.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Preparing payment checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-destructive font-medium">Connection Error</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isInactivePaymentLink) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-muted-foreground font-medium">Payment Link Inactive</p>
          <p className="text-muted-foreground text-sm">This payment link has been disabled by the merchant and is no longer accepting payments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-card border border-border p-8 space-y-6">
          <div className="text-center">
            <MoneroLogo size={32} />
            <h1 className="text-xl font-bold text-foreground mt-3">
              {label ? decodeURIComponent(label).replace(/-/g, ' ') : 'Payment'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Pay with Monero (XMR)</p>
          </div>

          {paid ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Payment Confirmed!</h2>
              <p className="text-muted-foreground">{formattedFiatAmount} received - thank you!</p>
              {invoice?.txid && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Transaction ID</p>
                  <p className="font-mono text-[10px] text-foreground break-all">{invoice.txid}</p>
                </div>
              )}
            </div>
          ) : confirming ? (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Confirming Payment...</h2>
              <p className="text-muted-foreground text-sm">
                Your payment is being confirmed on the blockchain. This usually takes 2-5 minutes.
              </p>
            </div>
          ) : seenOnChain ? (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Payment Detected!</h2>
              <p className="text-muted-foreground text-sm">
                Your transaction has been detected. Waiting for final confirmation...
              </p>
            </div>
          ) : failed ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-destructive font-medium">Payment Failed or Expired</p>
              <p className="text-muted-foreground text-sm">
                {invoice?.status === 'expired'
                  ? 'This invoice has expired. Please refresh and try again.'
                  : 'Please try again or contact the merchant.'}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">{formattedFiatAmount}</p>
                <p className="text-primary font-mono mt-1">{formatXMR(xmrAmount)}</p>
                <p className="text-muted-foreground text-xs mt-1">1 XMR = {displaySymbol}{referenceRate.toFixed(2)} {displayCurrency}</p>
              </div>

              <div className="flex justify-center">
                <div className="bg-white rounded-2xl p-5">
                  <QRCodeSVG value={`monero:${subaddress}?tx_amount=${xmrAmount.toFixed(12)}`} size={200} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Send exactly to this address:</p>
                <button onClick={copyAddr} className="w-full p-3 rounded-lg bg-muted/30 border border-border text-xs font-mono text-muted-foreground break-all hover:border-primary/30 transition-colors text-left">
                  {subaddress}
                </button>
                <div className="flex items-center justify-between">
                  <button onClick={copyAddr} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy address'}
                  </button>
                </div>
              </div>

              {/* Payment progress (show same as POS) */}
              {invoiceId && subaddress && (
                <PaymentProgress
                  invoiceId={invoiceId}
                  fiatAmount={fiatAmount}
                  xmrAmount={xmrAmount}
                  subaddress={subaddress}
                />
              )}
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Powered by <span className="text-primary font-medium">MoneroFlow</span>
          </p>
        </div>
      </div>
    </div>
  );
}
