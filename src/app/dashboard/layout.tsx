import { generatePageMetadata } from "@/lib/metadata";
import { DashboardLayout as DashboardLayoutComponent } from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata() {
  return {
    ...(await generatePageMetadata("Dashboard")),
    // Completely disable PWA install prompts in the CRM dashboard
    manifest: undefined,
    other: {
      'mobile-web-app-capable': 'no',
      'apple-mobile-web-app-capable': 'no',
      'apple-mobile-web-app-status-bar-style': undefined,
      'apple-touch-icon': undefined,
      'application-name': undefined,
      'apple-mobile-web-app-title': undefined,
      'msapplication-TileColor': undefined,
      'msapplication-TileImage': undefined,
      'msapplication-config': undefined,
      'theme-color': undefined,
      'apple-mobile-web-app-orientations': undefined,
    }
  };
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    // Disable PWA viewport settings
    viewportFit: 'auto'
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE: Owner redirect to /dashboard/financial is now handled by middleware
  // to avoid redirect loops. This layout no longer does role-based redirects.

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 DASHBOARD LAYOUT: User role:', profile?.role);

    // Only log for admin users - no redirect needed
    if (profile?.role === 'admin') {
      console.log('🔄 DASHBOARD LAYOUT: Admin user accessing sales dashboard - allowing access');
    }

    // Owner redirect is handled by middleware to avoid loops
    if (profile?.role === 'owner') {
      console.log('🔄 DASHBOARD LAYOUT: Owner user - middleware handles redirect');
    }
  }

  return <DashboardLayoutComponent>{children}</DashboardLayoutComponent>;
}