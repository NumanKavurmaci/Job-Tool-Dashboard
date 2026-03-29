import type { ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardNav />
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
        {children}
      </main>
    </>
  );
}
