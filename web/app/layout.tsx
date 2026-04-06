import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Core Protocol — Þjálfunarnámskeið",
  description: "Veldu markmið þitt og við finnum námskeið fyrir þig.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="is">
      <body className={`${inter.className} bg-zinc-50 text-zinc-900 min-h-screen`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
