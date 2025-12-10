import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return await generatePageMetadata("Stripe Integration");
}

export default function StripeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}