import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { PrivacyBanner } from '@/components/PrivacyBanner';
import { SeedBackupWarning } from '@/components/SeedBackupWarning';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar
} from '@/components/ui/sidebar';
import { LayoutDashboard, FileText, Clock, Settings, LogOut, RefreshCw, MonitorSmartphone, BarChart3, Link2, Plug, Globe, Paintbrush, Landmark, Gift, Server, Shield, HardDrive, Users } from 'lucide-react';

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
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useStore(s => s.logout);

  const renderNav = (items: typeof mainNav) => (
    <SidebarMenu>
      {items.map(item => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === '/dashboard'}
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
          onClick={() => { logout(); navigate('/'); }}
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

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-3">
              <SeedBackupWarning />
              <ManagedBadge />
              <PrivacyBanner />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
