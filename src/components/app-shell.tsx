import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/sources", label: "Sources" },
];

export function AppShell({
  children,
  activePath,
  usingDemoData = false,
}: {
  children: ReactNode;
  activePath: string;
  usingDemoData?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(247,115,22,0.18),_transparent_32%),linear-gradient(180deg,#fbf7ef_0%,#fffdf9_45%,#f7f2e7_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8">
        <header className="sticky top-5 z-20 mb-6 rounded-[30px] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-orange-700">
                AI job discovery agent
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Curated roles, scored with reasons.
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    activePath === item.href
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <span
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em]",
                  usingDemoData
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800",
                )}
              >
                {usingDemoData ? "Demo data mode" : "Database mode"}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
