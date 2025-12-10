import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return await generatePageMetadata("Product Management");
}

export default function ProductManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}