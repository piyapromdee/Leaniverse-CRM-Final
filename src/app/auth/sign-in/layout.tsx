import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return await generatePageMetadata("Sign In");
}

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}