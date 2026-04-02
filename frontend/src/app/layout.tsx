import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";

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
    <html lang="cs" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen">
        {/* Animated Background */}
        <div className="bg-gradient-mesh">
          <div className="bg-orb-gold" />
        </div>

        {/* App */}
        <AuthProvider>
          <div className="relative z-10">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
