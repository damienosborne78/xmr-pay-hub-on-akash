import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Loader2, Radio, Shield, Zap, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useStore } from '@/lib/store';

interface PaymentProgressProps {
  invoiceId: string;
  fiatAmount: number;
  xmrAmount: number;
  subaddress: string;
  onPaid?: () => void;
}

type PaymentStage = 'waiting' | 'mempool' | 'confirming' | 'confirmed';

const BLOCK_TIME_SECONDS = 120; // Monero avg ~2 min per block

export function PaymentProgress({ invoiceId, fiatAmount, xmrAmount, subaddress, onPaid }: PaymentProgressProps) {
  const invoice = useStore(s => s.invoices.find(i => i.id === invoiceId));
  const merchant = useStore(s => s.merchant);
  const requiredConfs = merchant.requiredConfirmations ?? 1;
  const zeroConfEnabled = merchant.zeroConfEnabled;
  const zeroConfThreshold = merchant.zeroConfThresholdUsd || 30;
  const isZeroConfEligible = zeroConfEnabled && fiatAmount <= zeroConfThreshold;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);

  const confirmations = invoice?.confirmations || 0;
  const status = invoice?.status || 'pending';

  const stage: PaymentStage = useMemo(() => {
    if (status === 'paid' || status === 'overpaid') return 'confirmed';
    if (status === 'confirming') return 'confirming';
    if (status === 'seen_on_chain') return isZeroConfEligible ? 'confirmed' : 'mempool';
    return 'waiting';
  }, [status, isZeroConfEligible]);

  // Fire callback when confirmed
  useEffect(() => {
    if (stage === 'confirmed' && onPaid) {
      onPaid();
    }
  }, [stage, onPaid]);

  // Pulse animation on stage change
  useEffect(() => {
    setPulseKey(k => k + 1);
  }, [stage]);

  // Elapsed timer
  useEffect(() => {
    if (stage === 'confirmed') return;
    const t = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  // ETA calculation
  const etaSeconds = useMemo(() => {
    if (stage === 'confirmed') return 0;
    if (stage === 'waiting') return null; // unknown
    const remainingConfs = Math.max(0, requiredConfs - confirmations);
    return remainingConfs * BLOCK_TIME_SECONDS;
  }, [stage, requiredConfs, confirmations]);

  const formatTime = (secs: number) => {
    if (secs < 60) return `~${secs}s`;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return rem > 0 ? `~${mins}m ${rem}s` : `~${mins}m`;
  };

  // Progress percentage
  const progressPercent = useMemo(() => {
    if (stage === 'confirmed') return 100;
    if (stage === 'waiting') return 5;
    if (stage === 'mempool') return 25;
    // confirming: scale from 30 to 95 based on confirmations
    const confProgress = Math.min(confirmations / requiredConfs, 1);
    return 25 + confProgress * 70;
  }, [stage, confirmations, requiredConfs]);

  const steps = [
    { id: 'broadcast', label: 'Waiting for payment', icon: Radio, done: stage !== 'waiting' },
    { id: 'mempool', label: 'Seen in mempool (0-conf)', icon: Zap, done: stage === 'confirming' || stage === 'confirmed' },
    { id: 'confirming', label: `${confirmations}/${requiredConfs} confirmations`, icon: Shield, done: stage === 'confirmed' },
    { id: 'confirmed', label: 'Payment confirmed!', icon: Check, done: stage === 'confirmed' },
  ];

  // Skip mempool step for 0-conf eligible
  if (isZeroConfEligible) {
    steps[1].label = 'Seen in mempool → auto-approved';
  }

  const stageColors: Record<PaymentStage, string> = {
    waiting: 'text-muted-foreground',
    mempool: 'text-warning',
    confirming: 'text-primary',
    confirmed: 'text-success',
  };

  const stageMessages: Record<PaymentStage, { title: string; subtitle: string }> = {
    waiting: {
      title: 'Awaiting payment...',
      subtitle: 'Scan the QR code with your Monero wallet',
    },
    mempool: {
      title: 'Payment detected! 🎉',
      subtitle: 'Your transaction is in the mempool. Waiting for block confirmation...',
    },
    confirming: {
      title: `Confirming... (${confirmations}/${requiredConfs})`,
      subtitle: etaSeconds ? `Estimated ${formatTime(etaSeconds)} remaining` : 'Almost there...',
    },
    confirmed: {
      title: 'Payment confirmed! ✅',
      subtitle: 'Thank you — your order is being processed',
    },
  };

  const msg = stageMessages[stage];

  return (
    <div className="w-full space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${stageColors[stage]}`}>{msg.title}</span>
          {stage !== 'confirmed' && etaSeconds !== null && (
            <Badge variant="outline" className="text-muted-foreground border-border text-[10px] gap-1">
              <Clock className="w-3 h-3" />
              ETA {formatTime(etaSeconds)}
            </Badge>
          )}
        </div>
        <motion.div key={pulseKey} initial={{ scale: 1.02 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
          <Progress value={progressPercent} className="h-2.5 bg-muted/30" />
        </motion.div>
        <p className="text-[10px] text-muted-foreground">{msg.subtitle}</p>
      </div>

      {/* Step indicators */}
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const isCurrent =
            (step.id === 'broadcast' && stage === 'waiting') ||
            (step.id === 'mempool' && stage === 'mempool') ||
            (step.id === 'confirming' && stage === 'confirming') ||
            (step.id === 'confirmed' && stage === 'confirmed');

          return (
            <motion.div
              key={step.id}
              initial={false}
              animate={{
                opacity: step.done || isCurrent ? 1 : 0.4,
                x: isCurrent ? 4 : 0,
              }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-2.5 text-xs py-1.5 px-2 rounded-lg transition-colors ${
                isCurrent ? 'bg-primary/5 border border-primary/10' : ''
              }`}
            >
              {step.done ? (
                <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-success" />
                </div>
              ) : isCurrent ? (
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                  <step.icon className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
              <span className={`${step.done ? 'text-foreground' : isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* 0-conf disclaimer */}
      {isZeroConfEligible && stage === 'confirmed' && confirmations === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/20"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <p className="text-[10px] text-warning leading-relaxed">
            Auto-approved at 0-conf (amount under {merchant.fiatSymbol || '$'}{zeroConfThreshold}). 
            Full confirmation will follow in ~2 minutes.
          </p>
        </motion.div>
      )}

      {/* Polling indicator */}
      {stage !== 'confirmed' && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Checking every 12 seconds · {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')} elapsed
        </div>
      )}
    </div>
  );
}
