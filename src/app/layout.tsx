import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { AdminGate } from "@/components/admin/AdminGate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Edifice — Admin Console",
  description: "Internal operations console for the Edifice platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body>
        <QueryProvider>
          <ToastProvider>
            <AdminGate>{children}</AdminGate>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
