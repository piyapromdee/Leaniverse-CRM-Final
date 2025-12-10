import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return await generatePageMetadata("Sign Up");
}

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}