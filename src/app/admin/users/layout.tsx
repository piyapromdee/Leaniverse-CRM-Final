import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return await generatePageMetadata("User Management");
}

export default function UserManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}