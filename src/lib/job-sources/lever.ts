import type { JobSource, SourceFetchJob } from "@/lib/types";

type LeverPosting = {
  id: string;
  hostedUrl: string;
  text: string;
  categories?: {
    location?: string;
  };
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: Array<{ content: string }>;
  createdAt?: number;
};

export async function fetchLeverJobs(source: JobSource): Promise<SourceFetchJob[]> {
  const site = String(source.selectorConfig?.site ?? "");

  if (!site) {
    return [];
  }

  const response = await fetch(
    `https://api.lever.co/v0/postings/${site}?mode=json`,
    {
      cache: "no-store",
      headers: { "User-Agent": "ai-job-discovery-agent/0.1" },
    },
  );

  if (!response.ok) {
    throw new Error(`Lever fetch failed for ${source.name}: ${response.status}`);
  }

  const data = (await response.json()) as LeverPosting[];

  return data.map((job) => ({
    sourceJobId: job.id,
    url: job.hostedUrl,
    title: job.text,
    company: source.name.replace(/ Careers$/i, ""),
    location: job.categories?.location,
    description:
      job.descriptionPlain ??
      [job.additionalPlain, ...(job.lists ?? []).map((entry) => entry.content)]
        .filter(Boolean)
        .join("\n\n"),
    postedAtRaw: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
  }));
}
