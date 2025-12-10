'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Briefcase, FileText, Settings, CheckSquare, Mail, UserPlus, HelpCircle, Magnet, Target, DollarSign, MinusCircle, Shield } from 'lucide-react';
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

// Owner-specific navigation items (Financial Dashboard as default)
const OWNER_NAV_ITEMS = [
  { name: 'Financial Dashboard', href: '/dashboard/financial', icon: DollarSign, subtitle: 'Owner Overview' },
  { name: 'Expense Management', href: '/dashboard/expenses', icon: MinusCircle, subtitle: 'Track Costs' },
  { name: 'Leads', href: '/dashboard/leads', icon: UserPlus, subtitle: 'Marketing Pipeline (View Only)' },
  { name: 'Deals', href: '/dashboard/deals', icon: Briefcase, subtitle: 'Sales Pipeline (View Only)' },
  { name: 'Contacts & Companies', href: '/dashboard/contacts', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help & Guide', href: '/dashboard/help', icon: HelpCircle, subtitle: 'Documentation' },
  // Admin Panel access for Owner/Super Admin
  { name: 'Admin Panel', href: '/admin', icon: Shield, subtitle: 'User & System Management' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Set email immediately from auth user
          const authEmail = user.email || null;
          setUserEmail(authEmail);

          // Check if Super Admin by email FIRST
          if (authEmail && isUserSuperAdmin(authEmail, undefined)) {
            console.log('Sidebar: Super Admin detected by email:', authEmail);
            setUserRole(ROLES.OWNER); // Grant owner access for sidebar
            return;
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, email')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Sidebar: Profile fetch error:', profileError);
            // If Super Admin email, still grant owner role
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
        console.error('Sidebar: Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [supabase]);

  // Determine if user is Owner/Super Admin
  const isOwnerRole = userRole === ROLES.OWNER || isUserSuperAdmin(userEmail || '', userRole || '');

  // Use appropriate nav items based on role
  const navItems = isOwnerRole ? OWNER_NAV_ITEMS : NAV_ITEMS;

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-6">
            <div className="flex items-center">
              {/* Dummi & Co Logo */}
              <div className="relative w-10 h-10 mr-3 flex-shrink-0">
                <img 
                  src="/dummi-co-logo-new.jpg" 
                  alt="Dummi & Co Logo" 
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <h1 className="text-xl font-bold text-gray-800">Dummi & Co</h1>
            </div>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && item.href !== '/dashboard/financial' && pathname?.startsWith(item.href));
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-6 w-6 flex-shrink-0 ${
                        isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
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
          </div>
        </div>
      </div>
    </div>
  );
}