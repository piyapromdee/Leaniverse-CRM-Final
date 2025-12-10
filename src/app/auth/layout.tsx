import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return await generatePageMetadata("Authentication");
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}