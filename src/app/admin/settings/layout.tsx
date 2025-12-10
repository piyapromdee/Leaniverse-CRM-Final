import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return await generatePageMetadata("System Settings");
}

export default function SystemSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}