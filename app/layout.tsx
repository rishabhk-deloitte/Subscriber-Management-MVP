import "./globals.css";
import { ReactNode, Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Converge Subscriber by Deloitte",
  description: "Synthetic MVP for Liberty Puerto Rico"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="p-6 text-slate-600">Loading experience…</div>}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
