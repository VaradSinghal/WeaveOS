import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "WeaveOS – Textile Delay Prediction",
  description:
    "AI-powered delay prediction dashboard for textile factory order management. Non-intrusive layer over Tally and Excel ERP systems.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <TopNav />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
