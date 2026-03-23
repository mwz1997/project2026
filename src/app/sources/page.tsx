import { triggerPipelineAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { getDashboardView } from "@/lib/store";
import { formatRelativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const view = await getDashboardView();

  return (
    <AppShell activePath="/sources" usingDemoData={view.usingDemoData}>
      <SectionCard title="Source health" eyebrow="Curated ingestion">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            MVP sources are intentionally narrow so the pipeline stays reliable, explainable,
            and easy to maintain. The current implementation supports static seeded feeds plus
            Greenhouse and Lever style adapters.
          </p>
          <form action={triggerPipelineAction}>
            <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-slate-700">
              Run pipeline
            </button>
          </form>
        </div>

        <div className="grid gap-4">
          {view.sources.map((source) => (
            <article
              key={source.id}
              className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                    {source.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{source.baseUrl}</p>
                </div>
                <div className="text-sm text-slate-600">
                  Last fetch {source.lastFetchedAt ? formatRelativeDate(source.lastFetchedAt) : "never"}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                  Type: {source.type}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                  Strategy: {source.fetchStrategy || "default"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                  Status: {source.lastFetchStatus || "idle"}
                </span>
              </div>
              {source.lastFetchMessage ? (
                <p className="mt-3 text-sm text-slate-600">{source.lastFetchMessage}</p>
              ) : null}
            </article>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  );
}
