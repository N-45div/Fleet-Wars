import type { Metadata } from "next";
import { Orbitron, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/providers/WalletProvider";
import { Header } from "@/components/Header";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fleet Wars | Naval Combat on Solana",
  description: "Real-time battleship game powered by Solana and MagicBlock Ephemeral Rollups. Deploy your fleet, challenge opponents, win SOL.",
  keywords: ["solana", "blockchain", "game", "battleship", "web3", "magicblock"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${orbitron.variable} ${jetbrains.variable} antialiased`}>
        <WalletProvider>
          <div className="min-h-screen cyber-grid relative">
            <Header />
            <main className="pt-20 px-4 pb-8">
              {children}
            </main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
