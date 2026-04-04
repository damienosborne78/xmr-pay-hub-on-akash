import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/FadeIn';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Shield, Globe, ArrowRight, Check, X, Clock,
  Wallet, Code, BarChart3, Lock, RefreshCw
} from 'lucide-react';

const features = [
  { icon: Zap, title: 'Ready in 60 Seconds', desc: 'One-click onboarding. No node setup. No Docker. Just paste and go.' },
  { icon: Shield, title: 'Hybrid Custody', desc: 'Managed convenience or full self-sovereign mode — your keys, your choice.' },
  { icon: Globe, title: 'Fiat → XMR Conversion', desc: 'Invoice in USD, customer pays in XMR. Live conversion, zero friction.' },
  { icon: Wallet, title: 'Auto Cold Settlement', desc: 'Funds automatically settle to your cold wallet on a schedule you control.' },
  { icon: Code, title: 'Developer-First API', desc: 'RESTful API with webhooks. Shopify & WooCommerce plugins coming soon.' },
  { icon: BarChart3, title: 'Beautiful Dashboard', desc: 'Real-time analytics, invoice management, and payment tracking — finally done right.' },
];

const comparisons = [
  { feature: 'Self-custody option', us: true, nowpay: false, moneropay: true },
  { feature: 'No Docker/SQL needed', us: true, nowpay: true, moneropay: false },
  { feature: 'Managed infrastructure', us: true, nowpay: true, moneropay: false },
  { feature: 'Fiat conversion', us: true, nowpay: true, moneropay: false },
  { feature: 'Modern dashboard', us: true, nowpay: false, moneropay: false },
  { feature: 'Webhook notifications', us: true, nowpay: true, moneropay: true },
  { feature: 'Free tier', us: true, nowpay: false, moneropay: true },
  { feature: 'No custodial fees', us: true, nowpay: false, moneropay: true },
];

const testimonials = [
  { name: 'Alex K.', role: 'E-commerce Owner', text: 'Finally a Monero payment solution that doesn\'t look like it was built in 2015. My customers love the checkout experience.' },
  { name: 'Sarah M.', role: 'SaaS Founder', text: 'Integrated MoneroFlow in under 10 minutes. The webhooks just work. This is what Monero payments should have always been.' },
  { name: 'Dmitri V.', role: 'Privacy Advocate', text: 'Self-sovereign mode means I never give up my keys. The managed option is there when I need convenience. Best of both worlds.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-surface-glass backdrop-blur-xl border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <BrandLogo />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-orange hover:opacity-90">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="container relative z-10 text-center">
          <FadeIn>
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary px-4 py-1.5 text-sm">
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Privacy-First Payments
            </Badge>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Stripe for{' '}
              <span className="text-gradient-orange">Monero</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Accept XMR payments in 60 seconds. Beautiful dashboard, instant invoicing,
              webhook notifications — without giving up custody of your keys.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="flex items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="bg-gradient-orange hover:opacity-90 glow-orange-sm text-base px-8 h-12">
                  Start Accepting XMR <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/invoice/inv_a1b2c3">
                <Button variant="outline" size="lg" className="border-border hover:border-primary/50 text-base px-8 h-12">
                  See Demo Invoice
                </Button>
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={0.4}>
            <p className="mt-4 text-sm text-muted-foreground">Free tier · No credit card · 10 tx/month included</p>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-surface-elevated/50">
        <div className="container">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to accept <span className="text-primary">Monero</span></h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">Built for merchants who want privacy-preserving payments without the operational headache.</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <div className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 h-full">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-24">
        <div className="container">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why <span className="text-primary">MoneroFlow</span>?</h2>
              <p className="text-muted-foreground text-lg">See how we compare to existing solutions.</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="max-w-3xl mx-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-muted-foreground font-medium">Feature</th>
                    <th className="py-4 px-4 text-primary font-bold">MoneroFlow</th>
                    <th className="py-4 px-4 text-muted-foreground font-medium">NOWPayments</th>
                    <th className="py-4 px-4 text-muted-foreground font-medium">MoneroPay</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row) => (
                    <tr key={row.feature} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                      <td className="py-3 px-4 text-foreground">{row.feature}</td>
                      <td className="py-3 px-4 text-center">{row.us ? <Check className="w-4 h-4 text-primary mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />}</td>
                      <td className="py-3 px-4 text-center">{row.nowpay ? <Check className="w-4 h-4 text-muted-foreground mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />}</td>
                      <td className="py-3 px-4 text-center">{row.moneropay ? <Check className="w-4 h-4 text-muted-foreground mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-surface-elevated/50">
        <div className="container">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Trusted by <span className="text-primary">privacy-first</span> merchants</h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">"{t.text}"</p>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.role}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="container">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple, transparent <span className="text-primary">pricing</span></h2>
            <p className="text-center text-muted-foreground mb-16 text-lg">No hidden fees. No percentage cuts on your transactions.</p>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <FadeIn delay={0.1}>
              <div className="p-8 rounded-xl bg-card border border-border">
                <h3 className="text-xl font-bold mb-2 text-foreground">Free</h3>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-foreground">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['10 transactions/month', 'Dashboard & analytics', 'Webhook notifications', 'API access', 'Community support'].map(f => (
                    <li key={f} className="flex items-center text-sm text-muted-foreground"><Check className="w-4 h-4 text-primary mr-2 shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link to="/signup"><Button variant="outline" className="w-full border-border hover:border-primary/50">Get Started</Button></Link>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="p-8 rounded-xl bg-card border border-primary/30 glow-orange relative">
                <Badge className="absolute -top-3 right-6 bg-gradient-orange text-primary-foreground border-0">Popular</Badge>
                <h3 className="text-xl font-bold mb-2 text-foreground">Pro</h3>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-foreground">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Unlimited transactions', 'Priority support', 'Custom branding', 'Advanced analytics', 'Self-sovereign mode', 'Multiple settlement wallets'].map(f => (
                    <li key={f} className="flex items-center text-sm text-muted-foreground"><Check className="w-4 h-4 text-primary mr-2 shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link to="/signup"><Button className="w-full bg-gradient-orange hover:opacity-90">Upgrade to Pro</Button></Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-surface-elevated/50">
        <div className="container text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to accept <span className="text-primary">Monero</span>?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">Join merchants worldwide who trust MoneroFlow for private, frictionless payments.</p>
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-orange hover:opacity-90 glow-orange-sm text-base px-10 h-12">
                Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <BrandLogo />
          <p className="text-muted-foreground text-sm">© 2024 MoneroFlow. Privacy is a right, not a feature.</p>
        </div>
      </footer>
    </div>
  );
}
