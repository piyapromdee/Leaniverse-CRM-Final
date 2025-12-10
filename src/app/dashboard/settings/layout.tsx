import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return await generatePageMetadata("User Settings");
}

export default function UserSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}