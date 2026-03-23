import type { ReactNode } from "react";

export function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      {eyebrow ? (
        <div className="text-xs uppercase tracking-[0.24em] text-orange-700">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
