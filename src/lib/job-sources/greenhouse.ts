import type { JobSource, SourceFetchJob } from "@/lib/types";

type GreenhouseResponse = {
  jobs: Array<{
    id: number;
    absolute_url: string;
    title: string;
    location?: { name?: string };
    updated_at?: string;
    content?: string;
  }>;
};

export async function fetchGreenhouseJobs(source: JobSource): Promise<SourceFetchJob[]> {
  const boardToken = String(source.selectorConfig?.boardToken ?? "");

  if (!boardToken) {
    return [];
  }

  const response = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`,
    {
      cache: "no-store",
      headers: { "User-Agent": "ai-job-discovery-agent/0.1" },
    },
  );

  if (!response.ok) {
    throw new Error(`Greenhouse fetch failed for ${source.name}: ${response.status}`);
  }

  const data = (await response.json()) as GreenhouseResponse;

  return data.jobs.map((job) => ({
    sourceJobId: String(job.id),
    url: job.absolute_url,
    title: job.title,
    company: source.name.replace(/ Careers$/i, ""),
    location: job.location?.name,
    description: job.content ?? "",
    postedAtRaw: job.updated_at,
  }));
}
