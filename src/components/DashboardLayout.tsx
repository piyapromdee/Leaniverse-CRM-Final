'use client';

import React, { ReactNode, useEffect } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useEffect(() => {
    // Prevent PWA install prompts in the CRM dashboard
    const preventPWAInstall = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Remove PWA install prompts and banners
    window.addEventListener('beforeinstallprompt', preventPWAInstall);
    window.addEventListener('appinstalled', preventPWAInstall);
    
    // Hide any existing install banners
    const hideInstallBanners = () => {
      const installBanners = document.querySelectorAll('[data-install-banner], .install-banner, .pwa-install');
      installBanners.forEach(banner => {
        (banner as HTMLElement).style.display = 'none';
      });
    };
    
    hideInstallBanners();
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', preventPWAInstall);
      window.removeEventListener('appinstalled', preventPWAInstall);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}