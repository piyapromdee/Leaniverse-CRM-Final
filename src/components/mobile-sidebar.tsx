'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, Users, Briefcase, FileText, Settings, CheckSquare, Mail, UserPlus, HelpCircle, Magnet, Target, DollarSign, MinusCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { isUserSuperAdmin, ROLES } from '@/lib/roles';

// Base navigation items for sales dashboard
const NAV_ITEMS = [
  { name: 'Sales Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/dashboard/leads', icon: UserPlus, subtitle: 'Marketing Pipeline' },
  { name: 'Lead Magnets', href: '/dashboard/lead-magnet', icon: Magnet, subtitle: 'Content Marketing' },
  { name: 'Deals', href: '/dashboard/deals', icon: Briefcase, subtitle: 'Sales Pipeline' },
  { name: 'Contacts & Companies', href: '/dashboard/contacts', icon: Users },
  { name: 'Contact Lists', href: '/dashboard/contact-lists', icon: Target, subtitle: 'Segments & Audiences' },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: FileText },
  { name: 'Email Templates', href: '/dashboard/templates', icon: Mail },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help & Guide', href: '/dashboard/help', icon: HelpCircle, subtitle: 'Documentation' },
];

// Owner-specific navigation items
const OWNER_NAV_ITEMS = [
  { name: 'Financial Dashboard', href: '/dashboard/financial', icon: DollarSign, subtitle: 'Owner Overview' },
  { name: 'Expense Management', href: '/dashboard/expenses', icon: MinusCircle, subtitle: 'Track Costs' },
  { name: 'Leads', href: '/dashboard/leads', icon: UserPlus, subtitle: 'Marketing Pipeline (View Only)' },
  { name: 'Deals', href: '/dashboard/deals', icon: Briefcase, subtitle: 'Sales Pipeline (View Only)' },
  { name: 'Contacts & Companies', href: '/dashboard/contacts', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help & Guide', href: '/dashboard/help', icon: HelpCircle, subtitle: 'Documentation' },
  { name: 'Admin Panel', href: '/admin', icon: Shield, subtitle: 'User & System Management' },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const authEmail = user.email || null;
          setUserEmail(authEmail);

          if (authEmail && isUserSuperAdmin(authEmail, undefined)) {
            setUserRole(ROLES.OWNER);
            return;
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, email')
            .eq('id', user.id)
            .single();

          if (profileError) {
            if (authEmail && isUserSuperAdmin(authEmail, undefined)) {
              setUserRole(ROLES.OWNER);
            }
            return;
          }

          if (profile) {
            setUserRole(profile.role);
            setUserEmail(profile.email || authEmail);
          }
        }
      } catch (error) {
        console.error('MobileSidebar: Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [supabase]);

  const isOwnerRole = userRole === ROLES.OWNER || isUserSuperAdmin(userEmail || '', userRole || '');
  const navItems = isOwnerRole ? OWNER_NAV_ITEMS : NAV_ITEMS;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-gray-200 px-4 py-4">
          <SheetTitle className="flex items-center gap-3">
            <img
              src="/dummi-co-logo-new.jpg"
              alt="Dummi & Co Logo"
              className="w-10 h-10 object-contain rounded-lg"
            />
            <span className="text-xl font-bold text-gray-800">Dummi & Co</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/dashboard/financial' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  {item.subtitle && (
                    <div className="text-xs text-gray-400 mt-0.5">{item.subtitle}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

// Hamburger Menu Button Component
export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="md:hidden p-2 hover:bg-gray-100"
      onClick={onClick}
      aria-label="Open menu"
    >
      <Menu className="h-6 w-6 text-gray-600" />
    </Button>
  );
}
