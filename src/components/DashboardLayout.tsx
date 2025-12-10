'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}