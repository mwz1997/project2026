import { triggerPipelineAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { JobCard } from "@/components/dashboard/job-card";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { getDashboardView } from "@/lib/store";
import { formatRelativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const view = await getDashboardView({
    bucket: typeof params.bucket === "string" ? (params.bucket as never) : "all",
    sourceId: typeof params.sourceId === "string" ? params.sourceId : "all",
    company: typeof params.company === "string" ? params.company : "all",
    location: typeof params.location === "string" ? params.location : "all",
    feedback: typeof params.feedback === "string" ? (params.feedback as never) : "all",
  });

  const applyNowCount = view.jobs.filter((entry) => entry.match.bucket === "apply_now").length;
  const reviewCount = view.jobs.filter((entry) => entry.match.bucket === "review").length;
  const hiddenCount = view.jobs.filter((entry) => entry.job.hiddenMatch).length;

  return (
    <AppShell activePath="/" usingDemoData={view.usingDemoData}>
      <div className="grid gap-6">
        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.95))] p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.28em] text-orange-700">
              Daily recommendation cockpit
            </div>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950">
              Ranked roles with visible tradeoffs, not mystery scores.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              The dashboard blends structured preferences, resume signals, source freshness,
              and recent feedback so you can move fast on strong matches and ignore weak ones.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <form action={triggerPipelineAction}>
                <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-slate-700">
                  Refresh curated jobs
                </button>
              </form>
              <a
                href="/profile"
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
              >
                Update profile
              </a>
              {view.lastPipelineRun ? (
                <span className="text-sm text-slate-500">
                  Last run {formatRelativeDate(view.lastPipelineRun.startedAt)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <MetricCard label="Apply now" value={applyNowCount} hint="High-fit roles with clear next steps." />
            <MetricCard label="Review" value={reviewCount} hint="Worth a look, but with one or two open questions." />
            <MetricCard label="Hidden matches" value={hiddenCount} hint="Roles that score well despite non-obvious titles." />
          </div>
        </section>

        <SectionCard title="Filters" eyebrow="Focus the board">
          <form className="grid gap-3 md:grid-cols-5">
            <select
              name="bucket"
              defaultValue={typeof params.bucket === "string" ? params.bucket : "all"}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="all">All buckets</option>
              <option value="apply_now">Apply now</option>
              <option value="review">Review</option>
              <option value="stretch">Stretch</option>
              <option value="skip">Skip</option>
            </select>
            <select
              name="sourceId"
              defaultValue={typeof params.sourceId === "string" ? params.sourceId : "all"}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="all">All sources</option>
              {view.sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            <input
              name="company"
              placeholder="Company"
              defaultValue={typeof params.company === "string" ? params.company : ""}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <input
              name="location"
              placeholder="Location"
              defaultValue={typeof params.location === "string" ? params.location : ""}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <select
              name="feedback"
              defaultValue={typeof params.feedback === "string" ? params.feedback : "all"}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="all">All feedback</option>
              <option value="up">Thumb up</option>
              <option value="down">Thumb down</option>
              <option value="none">No feedback</option>
            </select>
            <button className="rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-orange-500 md:col-span-5 lg:justify-self-start">
              Apply filters
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Ranked jobs" eyebrow="Recommendation list">
          <div className="grid gap-4">
            {view.jobs.length ? (
              view.jobs.map((item) => <JobCard key={item.job.id} item={item} />)
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
                No jobs match the current filters yet.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
