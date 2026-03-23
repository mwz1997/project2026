import Link from "next/link";

import { submitFeedbackAction } from "@/app/actions";
import type { JobWithMatch } from "@/lib/types";
import { formatMoney, formatRelativeDate } from "@/lib/utils";

function FeedbackButton({
  normalizedJobId,
  feedbackType,
  active,
}: {
  normalizedJobId: string;
  feedbackType: "up" | "down";
  active: boolean;
}) {
  return (
    <form action={submitFeedbackAction}>
      <input type="hidden" name="normalizedJobId" value={normalizedJobId} />
      <input type="hidden" name="feedbackType" value={feedbackType} />
      <button
        className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
          active
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"
        }`}
      >
        {feedbackType === "up" ? "Thumb up" : "Thumb down"}
      </button>
    </form>
  );
}

export function JobCard({ item }: { item: JobWithMatch }) {
  const salaryLine =
    item.job.salaryMin || item.job.salaryMax
      ? `${formatMoney(item.job.salaryMin)} - ${formatMoney(item.job.salaryMax)}`
      : "Salary not disclosed";

  return (
    <article className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfaf7_100%)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
              {item.match.bucket.replace("_", " ")}
            </span>
            <span className="text-sm text-slate-500">{item.source.name}</span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {item.job.titleNormalized}
          </h3>
          <p className="mt-1 text-base text-slate-700">
            {item.job.company} • {item.job.locationNormalized || "Location unknown"}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            {item.match.fitSummary}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 lg:min-w-[250px]">
          <div className="rounded-2xl bg-slate-950 p-3 text-white">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
              Match
            </div>
            <div className="mt-2 text-2xl font-semibold">{item.match.matchScore}</div>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Confidence
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {item.match.confidenceScore}
            </div>
          </div>
          <div className="rounded-2xl bg-amber-100 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700">
              Urgency
            </div>
            <div className="mt-2 text-2xl font-semibold text-amber-950">
              {item.match.urgencyScore}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">Why it matched:</span>{" "}
            {item.match.reasoning.length
              ? item.match.reasoning.join(" ")
              : "The score comes mostly from baseline title and skill fit."}
          </div>
          <div className="flex flex-wrap gap-2">
            {item.job.skillsRequired.map((skill) => (
              <span
                key={`${item.job.id}-${skill}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
          {item.match.missingSkills.length ? (
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">Missing skills:</span>{" "}
              {item.match.missingSkills.join(", ")}
            </p>
          ) : null}
          {item.match.blockingReasons.length ? (
            <p className="text-sm text-rose-700">
              <span className="font-medium">Blockers:</span>{" "}
              {item.match.blockingReasons.join(" ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">Posted:</span>{" "}
            {formatRelativeDate(item.job.postedAt)}
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">Comp:</span> {salaryLine}
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">Sponsorship:</span>{" "}
            {item.job.sponsorshipStatus}
          </div>
          <div className="flex flex-wrap gap-2">
            <FeedbackButton
              normalizedJobId={item.job.id}
              feedbackType="up"
              active={item.feedback === "up"}
            />
            <FeedbackButton
              normalizedJobId={item.job.id}
              feedbackType="down"
              active={item.feedback === "down"}
            />
          </div>
          <Link
            href={`/jobs/${item.job.id}`}
            className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Open detail
          </Link>
        </div>
      </div>
    </article>
  );
}
