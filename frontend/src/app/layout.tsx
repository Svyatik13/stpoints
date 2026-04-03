import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { I18nProvider } from "@/lib/i18n";
import ReferralHandler from "@/components/ReferralHandler";

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ST-Points | Elitní Digitální Aktiva",
  description: "ST-Points — extrémně vzácná digitální aktiva vydávaná ZČU Central Node. Těžte, sbírejte a chraňte si svůj zůstatek.",
  keywords: "ST-Points, digitální aktiva, těžba, kryptoměna, ZČU",
  openGraph: {
    title: "ST-Points | Elitní Digitální Aktiva",
    description: "Extrémně vzácná digitální aktiva vydávaná ZČU Central Node.",
    type: "website",
    url: "https://stpoints.fun",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans">
        {/* Animated Background */}
        <div className="bg-gradient-mesh">
          <div className="bg-orb-gold" />
        </div>

        {/* App */}
        <ErrorBoundary>
          <I18nProvider>
            <AuthProvider>
              <ReferralHandler />
              <ToastProvider>
                <div className="relative z-10">
                  {children}
                </div>
              </ToastProvider>
            </AuthProvider>
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
