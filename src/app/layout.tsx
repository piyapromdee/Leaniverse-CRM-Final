import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Kanit } from "next/font/google";
import "./globals.css";
import AuthErrorHandler from "@/components/auth-error-handler";
import { Toaster } from "sonner";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "Dummi & Co - Simple CRM for Growing Teams",
  description: "The Simple CRM for Growing Teams. Stop juggling spreadsheets and start closing deals with Dummi & Co.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${kanit.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* <AuthErrorHandler /> */}
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'sonner-toast',
            style: {
              background: 'white',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
            },
          }}
        />
      </body>
    </html>
  );
}
