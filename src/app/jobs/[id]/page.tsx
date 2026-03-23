import Link from "next/link";
import { notFound } from "next/navigation";

import { submitFeedbackAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { getJobDetail } from "@/lib/store";
import { formatMoney, formatRelativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getJobDetail(id);

  if (!result.job) {
    notFound();
  }

  const { job } = result;

  return (
    <AppShell activePath="/" usingDemoData={result.usingDemoData}>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title={job.job.titleNormalized} eyebrow={job.job.company}>
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Location:</span>{" "}
              {job.job.locationNormalized || "Unknown"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Posted:</span>{" "}
              {formatRelativeDate(job.job.postedAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Salary:</span>{" "}
              {formatMoney(job.job.salaryMin)} - {formatMoney(job.job.salaryMax)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Fit summary:</span>{" "}
              {job.match.fitSummary}
            </p>
            <p>
              <span className="font-medium text-slate-900">Reasoning:</span>{" "}
              {job.match.reasoning.join(" ")}
            </p>
            <div>
              <div className="font-medium text-slate-900">Raw description preview</div>
              <pre className="mt-2 whitespace-pre-wrap rounded-[24px] border border-slate-200 bg-slate-50 p-4 font-sans text-sm leading-7 text-slate-700">
                {job.rawJob.rawDescription}
              </pre>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Score breakdown" eyebrow="Why it landed here">
          <div className="space-y-4">
            {Object.entries(job.match.scoreBreakdown).map(([key, value]) => (
              <div key={key}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium capitalize text-slate-700">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span className="font-semibold text-slate-950">{value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{ width: `${Math.max(0, Math.min(100, value * 5))}%` }}
                  />
                </div>
              </div>
            ))}

            {job.match.missingSkills.length ? (
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">Missing skills:</span>{" "}
                {job.match.missingSkills.join(", ")}
              </p>
            ) : null}

            {job.match.blockingReasons.length ? (
              <p className="text-sm text-rose-700">
                <span className="font-medium">Blockers:</span>{" "}
                {job.match.blockingReasons.join(" ")}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-3">
              <form action={submitFeedbackAction}>
                <input type="hidden" name="normalizedJobId" value={job.job.id} />
                <input type="hidden" name="feedbackType" value="up" />
                <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Thumb up
                </button>
              </form>
              <form action={submitFeedbackAction}>
                <input type="hidden" name="normalizedJobId" value={job.job.id} />
                <input type="hidden" name="feedbackType" value="down" />
                <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  Thumb down
                </button>
              </form>
              <Link
                href={job.rawJob.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-orange-300 px-4 py-2 text-sm font-medium text-orange-700"
              >
                Open original listing
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
