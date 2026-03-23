import { savePreferencesAction, uploadResumeAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { getDashboardView } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const view = await getDashboardView();
  const profile = view.candidateProfile;
  const preferences = view.preferences;

  return (
    <AppShell activePath="/profile" usingDemoData={view.usingDemoData}>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Resume ingestion" eyebrow="Profile source">
          <form action={uploadResumeAction} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Upload resume
            </label>
            <input
              type="file"
              name="resume"
              accept=".pdf,.doc,.docx,.txt"
              className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-slate-700">
              Parse resume
            </button>
          </form>

          {profile ? (
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">Latest file:</span>{" "}
                {profile.resumeFilename || "Unknown"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Roles:</span>{" "}
                {profile.roles.join(", ") || "None extracted yet"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Skills:</span>{" "}
                {profile.skills.join(", ") || "None extracted yet"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Tools:</span>{" "}
                {profile.tools.join(", ") || "None extracted yet"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Confidence:</span>{" "}
                {profile.parseConfidence ?? "Unknown"} / 100
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-600">
              Upload a resume to generate the structured candidate profile.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Preferences" eyebrow="Scoring inputs">
          <form action={savePreferencesAction} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Target roles
                <input
                  name="targetRoles"
                  defaultValue={preferences.targetRoles.join(", ")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Industries
                <input
                  name="industries"
                  defaultValue={preferences.industries.join(", ")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Locations
                <input
                  name="locations"
                  defaultValue={preferences.locations.join(", ")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Remote policy
                <select
                  name="remotePolicy"
                  defaultValue={preferences.remotePolicy ?? "flexible"}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                >
                  <option value="flexible">Flexible</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Salary minimum
                <input
                  name="salaryMin"
                  type="number"
                  defaultValue={preferences.salaryMin ?? ""}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Seniority
                <select
                  name="seniority"
                  defaultValue={preferences.seniority ?? "mid"}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                >
                  <option value="entry">Entry</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="staff">Staff</option>
                  <option value="principal">Principal</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Include keywords
                <input
                  name="keywordsInclude"
                  defaultValue={preferences.keywordsInclude.join(", ")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Exclude keywords
                <input
                  name="keywordsExclude"
                  defaultValue={preferences.keywordsExclude.join(", ")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  name="sponsorshipRequired"
                  defaultChecked={preferences.sponsorshipRequired}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Sponsorship required
              </label>
            </div>

            <button className="rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-orange-500">
              Save preferences
            </button>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
