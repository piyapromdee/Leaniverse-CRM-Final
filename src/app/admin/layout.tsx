'use client'

import { generatePageMetadata } from "@/lib/metadata";
import { MasterFilterProvider } from '@/contexts/MasterFilterContext'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MasterFilterProvider>
      {children}
    </MasterFilterProvider>
  );
}