import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  TrendingUp,
  Settings,
  Users,
  BarChart3,
  Workflow,
  FileText,
  Calendar,
  Bell,
  ChevronRight,
  Brain,
  ShoppingCart,
  Building2,
  Calculator
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { DKEGLLogo } from '@/components/DKEGLLogo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard
  },
  {
    name: 'Manufacturing',
    href: '/manufacturing',
    icon: Workflow,
    children: [
      { name: 'Workflow Dashboard', href: '/manufacturing' },
      { name: 'New Order', href: '/manufacturing/orders/new' },
      { name: 'BOM Management', href: '/manufacturing/bom' },
      { name: 'UIORN Tracking', href: '/manufacturing/tracking' },
      { name: 'Tape Orders', href: '/manufacturing/orders' },
      { name: 'Gravure Printing', href: '/manufacturing/gravure' },
      { name: 'Lamination & Coating', href: '/manufacturing/lamination' },
      { name: 'Adhesive Coating', href: '/manufacturing/coating' },
      { name: 'Slitting & Packaging', href: '/manufacturing/slitting' }
    ]
  },
  {
    name: "Procurement",
    href: "/procurement/dashboard",
    icon: ShoppingCart,
    children: [
      { name: "Dashboard", href: "/procurement/dashboard" },
      { name: "Vendors", href: "/procurement/vendors" },
      { name: "Purchase Orders", href: "/procurement/purchase-orders" },
    ]
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
    children: [
      { name: 'Enterprise Stock Management', href: '/inventory/stock' },
      { name: 'Opening Stock Manager', href: '/inventory/opening-stock' },
      { name: 'GRN Logs', href: '/inventory/grn' },
      { name: 'Issue Logs', href: '/inventory/issues' },
      { name: 'Item Master', href: '/inventory/items' },
      { name: 'Pricing Master', href: '/inventory/pricing' },
      { name: 'Tally Import', href: '/imports/tally' },
      { name: 'Tally Dashboard', href: '/tally/dashboard' },
      { name: 'Invoice Generator', href: '/invoices/generator' }
    ]
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    children: [
      { name: 'Production Reports', href: '/analytics/production' },
      { name: 'Stock Analysis', href: '/analytics/stock' },
      { name: 'Performance KPIs', href: '/analytics/kpi' }
    ]
  },
  {
    name: 'GST & Compliance',
    href: '/gst',
    icon: Calculator,
    children: [
      { name: 'GST Dashboard', href: '/gst/dashboard' },
      { name: 'Returns Guru', href: '/gst/returns' },
      { name: 'Compliance Center', href: '/gst/compliance' },
      { name: 'Tax Analytics', href: '/gst/analytics' }
    ]
  },
  {
    name: 'Quality Control',
    href: '/quality',
    icon: ClipboardList
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText
  },
  {
    name: 'Planning',
    href: '/planning',
    icon: Calendar
  },
  {
    name: 'AI Assistant',
    href: '/ai',
    icon: Brain
  }
];

const bottomNavigation = [
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings }
];

export function ModernSidebar() {
  const { state, open } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const hasActiveChild = (children?: Array<{ href: string }>) => {
    return children?.some(child => isActive(child.href)) || false;
  };

  return (
    <Sidebar className="border-sidebar-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <DKEGLLogo size="md" />
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">DKEGL</h1>
            <p className="text-xs text-sidebar-foreground/70">Enterprise ERP</p>
          </div>
        )}
      </div>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  {item.children ? (
                    <Collapsible defaultOpen={hasActiveChild(item.children)}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className={isActive(item.href) ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && (
                            <>
                              <span>{item.name}</span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!collapsed && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.name}>
                                <SidebarMenuSubButton 
                                  asChild
                                  className={isActive(child.href) ? "bg-sidebar-primary text-sidebar-primary-foreground" : ""}
                                >
                                  <NavLink to={child.href}>
                                    {child.name}
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton 
                      asChild
                      className={isActive(item.href) ? "bg-sidebar-primary text-sidebar-primary-foreground" : ""}
                    >
                      <NavLink to={item.href}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Navigation */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    asChild
                    className={isActive(item.href) ? "bg-sidebar-primary text-sidebar-primary-foreground" : ""}
                  >
                    <NavLink to={item.href}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}