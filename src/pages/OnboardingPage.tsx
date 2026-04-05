import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { MoneroLogo } from '@/components/BrandLogo';
import { Check, Copy, ArrowRight, Zap } from 'lucide-react';
import { FadeIn } from '@/components/FadeIn';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const merchant = useStore(s => s.merchant);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(merchant.primarySubaddress);
    setCopied(true);
    toast.success('Subaddress copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <FadeIn className="w-full max-w-md text-center relative z-10">
          <MoneroLogo size={64} className="mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-3">You're almost ready!</h1>
          <p className="text-muted-foreground mb-2">One click to enable native Monero payments — no third-party gateways, no custody risk.</p>
          <p className="text-xs text-muted-foreground/60 mb-8">Powered by monero-wallet-rpc · Managed securely by XMRPay</p>
          <Button onClick={() => setStep(1)} size="lg" className="bg-gradient-orange hover:opacity-90 glow-orange-sm px-10">
            <Zap className="mr-2 w-4 h-4" /> Enable Monero Payments
          </Button>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <FadeIn className="w-full max-w-lg text-center relative z-10">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 glow-orange-sm">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">You're all set!</h1>
        <p className="text-muted-foreground mb-1">Your native Monero subaddress is ready:</p>
        <p className="text-xs text-muted-foreground/60 mb-6">Generated via managed monero-wallet-rpc · Switch to self-custody anytime in Settings</p>
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <p className="font-mono text-xs text-muted-foreground break-all leading-relaxed">{merchant.primarySubaddress}</p>
          <Button variant="outline" size="sm" onClick={copyAddress} className="mt-3 border-border hover:border-primary/50">
            {copied ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
            {copied ? 'Copied' : 'Copy Address'}
          </Button>
        </div>
        <Button onClick={() => navigate('/dashboard')} size="lg" className="bg-gradient-orange hover:opacity-90">
          Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </FadeIn>
    </div>
  );
}
