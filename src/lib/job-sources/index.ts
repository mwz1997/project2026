import { fetchGreenhouseJobs } from "@/lib/job-sources/greenhouse";
import { fetchLeverJobs } from "@/lib/job-sources/lever";
import type { JobSource, SourceFetchJob } from "@/lib/types";

export async function fetchJobsForSource(source: JobSource): Promise<SourceFetchJob[]> {
  if (source.type === "greenhouse") {
    return fetchGreenhouseJobs(source);
  }

  if (source.type === "lever") {
    return fetchLeverJobs(source);
  }

  if (source.type === "static") {
    return ((source.selectorConfig?.jobs as SourceFetchJob[] | undefined) ?? []).map(
      (job) => ({ ...job }),
    );
  }

  return [];
}
