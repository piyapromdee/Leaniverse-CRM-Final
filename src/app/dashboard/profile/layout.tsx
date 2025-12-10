import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return await generatePageMetadata("Profile");
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}