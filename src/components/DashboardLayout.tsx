import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HelpProvider } from '@/components/HelpProvider';
import { HelpDialog } from '@/components/HelpDialog';
import { BrandLogo } from '@/components/BrandLogo';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { PrivacyBanner } from '@/components/PrivacyBanner';
import { SeedBackupWarning } from '@/components/SeedBackupWarning';
import { SweepChecker } from '@/components/SweepChecker';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar
} from '@/components/ui/sidebar';
import { LayoutDashboard, FileText, Clock, Settings, LogOut, RefreshCw, MonitorSmartphone, BarChart3, Link2, Plug, Globe, Paintbrush, Landmark, Gift, Server, Shield, HardDrive, Users, Sun, Moon, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

const THEMES = [
  { id: 'dark', label: 'Dark', swatch: '24 100% 50%' },
  { id: 'theme-light', label: 'Light', swatch: '0 0% 92%' },
  { id: 'theme-rose', label: 'Rose', swatch: '350 70% 55%' },
  { id: 'theme-lavender', label: 'Lavender', swatch: '260 60% 55%' },
  { id: 'theme-mint', label: 'Mint', swatch: '170 60% 40%' },
  { id: 'theme-peach', label: 'Peach', swatch: '25 85% 55%' },
] as const;

function ThemeToggle() {
  const [theme, setTheme] = useState<string>(() => {
    try { return localStorage.getItem('mf-theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-light', 'theme-rose', 'theme-lavender', 'theme-mint', 'theme-peach');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add(theme);
    }

    try { localStorage.setItem('mf-theme', theme); } catch {}
  }, [theme]);

  const activeTheme = THEMES.find(item => item.id === theme) || THEMES[0];

  const cycleTheme = () => {
    setTheme(current => {
      const index = THEMES.findIndex(item => item.id === current);
      return THEMES[(index + 1) % THEMES.length].id;
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="relative flex h-12 w-12 items-center justify-center">
        {THEMES.map((themeOption, index) => {
          const angle = (Math.PI * 2 * index) / THEMES.length - Math.PI / 2;
          const x = Math.cos(angle) * 22;
          const y = Math.sin(angle) * 22;
          const isActive = themeOption.id === theme;

          return (
            <span
              key={themeOption.id}
              className="absolute h-2.5 w-2.5 rounded-full border border-background transition-transform duration-200"
              style={{
                backgroundColor: `hsl(${themeOption.swatch})`,
                transform: `translate(${x}px, ${y}px) scale(${isActive ? 1.25 : 1})`,
                boxShadow: isActive ? '0 0 0 2px hsl(var(--card))' : 'none',
              }}
            />
          );
        })}

        <button
          onClick={cycleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-popover text-foreground shadow-lg transition-all hover:shadow-xl"
          title={`Theme: ${activeTheme.label}`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

const mainNav = [
  { title: 'Overview', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Invoices', url: '/dashboard/invoices', icon: FileText },
  { title: 'Subscriptions', url: '/dashboard/subscriptions', icon: RefreshCw },
  { title: 'Payments', url: '/dashboard/payments', icon: Clock },
];

const toolsNav = [
  { title: 'PoS Terminal', url: '/dashboard/pos', icon: MonitorSmartphone },
  { title: 'Payment Links', url: '/dashboard/links', icon: Link2 },
  { title: 'Referrals', url: '/dashboard/referrals', icon: Gift },
  { title: 'Analytics', url: '/dashboard/analytics', icon: BarChart3 },
  { title: 'Integrations', url: '/dashboard/integrations', icon: Plug },
  { title: 'Payouts', url: '/dashboard/payouts', icon: Landmark },
];

const configNav = [
  { title: 'Users', url: '/dashboard/users', icon: Users },
  { title: 'Localization', url: '/dashboard/localization', icon: Globe },
  { title: 'White-Label', url: '/dashboard/white-label', icon: Paintbrush },
  { title: 'Backups', url: '/dashboard/backups', icon: HardDrive },
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
];

function DashboardSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useStore(s => s.logout);

  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  const renderNav = (items: typeof mainNav) => (
    <SidebarMenu>
      {items.map(item => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === '/dashboard'}
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeClassName="bg-sidebar-accent text-primary font-medium"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <div className="p-4 border-b border-sidebar-border">
        <BrandLogo collapsed={collapsed} />
      </div>
      <SidebarContent className="py-4">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-muted-foreground text-xs px-3 mb-1">Main</SidebarGroupLabel>}
          <SidebarGroupContent>{renderNav(mainNav)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-muted-foreground text-xs px-3 mb-1">Tools</SidebarGroupLabel>}
          <SidebarGroupContent>{renderNav(toolsNav)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-muted-foreground text-xs px-3 mb-1">Config</SidebarGroupLabel>}
          <SidebarGroupContent>{renderNav(configNav)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <button
          onClick={() => { logout(); closeMobile(); navigate('/'); }}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors text-sm"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </Sidebar>
  );
}

function ManagedBadge() {
  const merchant = useStore(s => s.merchant);
  const isSelfCustody = !merchant.nativeRpcEnabled ? false : merchant.rpcConnected;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Badge variant="outline" className={isSelfCustody ? 'bg-primary/10 text-primary border-primary/20 text-xs cursor-help' : 'bg-success/10 text-success border-success/20 text-xs cursor-help'}>
            {isSelfCustody ? <Shield className="w-3 h-3 mr-1" /> : <Server className="w-3 h-3 mr-1" />}
            {isSelfCustody ? 'Self-Custody' : 'Browser Wallet'}
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        {isSelfCustody
          ? 'Connected to your own monero-wallet-rpc. Full sovereignty — your keys, your coins.'
          : 'In-browser wallet with local key derivation. Self-custody — your keys never leave your device.'}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Component to show sweep status indicator in header.
 * Alternates between yellow and green every 250ms when active.
 * Shows real-time progress messages from sweep process.
 */
function SweepStatusBanner() {
  const merchant = useStore(s => s.merchant);
  const [visible, setVisible] = useState(false);
  const [isYellow, setIsYellow] = useState(false);

  // Handle visibility timer
  useEffect(() => {
    if (merchant.activeSweepFlag) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 10000);
      return () => clearTimeout(timer);
    }

    if (merchant.lastSweepDate) {
      const sweepTime = new Date(merchant.lastSweepDate).getTime();
      const timeSinceSweep = Date.now() - sweepTime;
      if (timeSinceSweep < 5000) {
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 5000 - timeSinceSweep);
        return () => clearTimeout(timer);
      }
    }
  }, [merchant.activeSweepFlag, merchant.lastSweepDate]);

  // Handle color alternating when sweep is active
  useEffect(() => {
    if (!merchant.activeSweepFlag) {
      setIsYellow(false);
      return;
    }

    const interval = setInterval(() => {
      setIsYellow((prev) => !prev);
    }, 250);

    return () => clearInterval(interval);
  }, [merchant.activeSweepFlag]);

  if (!visible) return null;

  // Match Browser Wallet badge style with color alternation when active
  // Show progress message when sweep is active
  const activeColor = isYellow ? 'warning' : 'success';
  let bannerText = 'Cold Storage Sweep Complete';

  if (merchant.activeSweepFlag) {
    bannerText = merchant.activeSweepMessage || 'Cold Storage Sweep Activated';
  }

  return (
    <Badge variant="outline" className={`${
      merchant.activeSweepFlag
        ? `bg-${activeColor}/10 text-${activeColor} border-${activeColor}/20`
        : 'bg-success/10 text-success border-success/20'
    } text-xs gap-1.5 cursor-help`}>
      <Zap className="w-3 h-3" />
      {bannerText}
    </Badge>
  );
}

export default function DashboardLayout() {
  return (
    <HelpProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <DashboardSidebar />
          <SweepChecker enabled />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <SweepStatusBanner />
              </div>
              <div className="flex items-center gap-3">
                <SeedBackupWarning />
                <ManagedBadge />
                <PrivacyBanner />
              </div>
            </header>
            <main className="flex-1 p-6 overflow-auto">
              <Outlet />
            </main>
            <ThemeToggle />
          </div>
        </div>
      </SidebarProvider>
      <HelpDialog />
    </HelpProvider>
  );
}
