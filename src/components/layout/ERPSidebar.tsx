import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DKEGLLogo } from '@/components/DKEGLLogo';
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
  Boxes,
  Calendar,
  Bell
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

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
      { name: 'New Order', href: '/manufacturing/orders/new' },
      { name: 'Tape Orders', href: '/manufacturing/orders' },
      { name: 'Gravure Printing', href: '/manufacturing/gravure' },
      { name: 'Lamination', href: '/manufacturing/lamination' },
      { name: 'Adhesive Coating', href: '/manufacturing/coating' },
      { name: 'Slitting', href: '/manufacturing/slitting' },
      { name: 'Cost Analysis', href: '/manufacturing/cost-analysis' }
    ]
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
    children: [
      { name: 'Stock Management', href: '/inventory/stock' },
      { name: 'GRN Logs', href: '/inventory/grn' },
      { name: 'Issue Logs', href: '/inventory/issues' },
      { name: 'Item Master', href: '/inventory/items' },
      { name: 'Pricing Master', href: '/inventory/pricing' }
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
  }
];

const bottomNavigation = [
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings }
];

export function ERPSidebar({ className }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['Manufacturing', 'Inventory']);

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const isCurrentPath = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className={cn("flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-sidebar-border">
        <DKEGLLogo size="md" />
        <div>
          <h1 className="text-lg font-bold text-sidebar-foreground">DKEGL</h1>
          <p className="text-xs text-sidebar-foreground/70">Enterprise ERP</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <div key={item.name}>
            <button
              onClick={() => {
                if (item.children) {
                  toggleExpanded(item.name);
                } else {
                  handleNavigation(item.href);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                isCurrentPath(item.href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left">{item.name}</span>
              {item.children && (
                <svg
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedItems.includes(item.name) ? "rotate-90" : ""
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
            
            {item.children && expandedItems.includes(item.name) && (
              <div className="mt-1 ml-8 space-y-1">
                {item.children.map((child) => (
                  <button
                    key={child.name}
                    onClick={() => handleNavigation(child.href)}
                    className={cn(
                      "w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                      isCurrentPath(child.href)
                        ? "text-sidebar-primary bg-sidebar-accent font-medium"
                        : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
        {bottomNavigation.map((item) => (
          <button
            key={item.name}
            onClick={() => handleNavigation(item.href)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
              isCurrentPath(item.href)
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}