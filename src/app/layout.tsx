import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
// import SessionProvider from "@/context/SessionProvider";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Tikd.",
  description: "Discover and book events effortlessly.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="flex min-h-screen flex-col bg-surface text-brand-900">
        {/* <SessionProvider> */}
          <ToastProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        {/* </SessionProvider> */}
      </body>
    </html>
  );
}
