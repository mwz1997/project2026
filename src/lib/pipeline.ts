import { randomUUID } from "node:crypto";

import { flags } from "@/lib/env";
import { fetchJobsForSource } from "@/lib/job-sources";
import {
  buildFeedbackSignals,
  buildMatchResult,
  hashContent,
  normalizeRawJob,
} from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { getMutableDemoStore, loadAppState, saveDerivedMatches } from "@/lib/store";
import type {
  JobStatus,
  JobSource,
  MatchResultInput,
  NormalizedJob,
  NormalizedJobInput,
  PipelineTrigger,
  RawJobPosting,
} from "@/lib/types";

function dedupeStatuses(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Set<string>();

  return jobs.map((job) => {
    const key = `${job.company.toLowerCase()}|${job.titleNormalized.toLowerCase()}|${(job.locationNormalized ?? "").toLowerCase()}`;
    const status: JobStatus = seen.has(key) ? "stale" : "active";
    seen.add(key);
    return { ...job, status };
  });
}

async function runDemoPipeline(trigger: PipelineTrigger) {
  const state = getMutableDemoStore();
  const now = new Date();

  state.sources = state.sources.map((source) => ({
    ...source,
    lastFetchedAt: now,
    lastFetchStatus: "success",
    lastFetchMessage: "Demo source refreshed from the seeded dataset.",
    updatedAt: now,
  }));

  const rescoredJobs = dedupeStatuses(state.normalizedJobs);
  state.normalizedJobs = rescoredJobs;

  const feedbackSignals = buildFeedbackSignals(
    state.feedbackEvents,
    state.normalizedJobs,
  );
  const rawById = new Map(state.rawJobs.map((job) => [job.id, job]));

  const matchResults: MatchResultInput[] = state.normalizedJobs.map((job) =>
    buildMatchResult(
      job,
      rawById.get(job.rawJobPostingId)!,
      state.candidateProfile,
      state.preferences,
      feedbackSignals,
      `run_demo_${Date.now()}`,
    ),
  );

  await saveDerivedMatches(matchResults, `run_demo_${Date.now()}`);

  state.pipelineRuns.unshift({
    id: randomUUID(),
    trigger,
    status: "success",
    startedAt: now,
    finishedAt: now,
    jobsFetched: state.rawJobs.length,
    jobsParsed: state.normalizedJobs.length,
    jobsScored: state.normalizedJobs.length,
    message: "Demo pipeline recomputed rankings from seeded sources.",
    createdAt: now,
    updatedAt: now,
  });

  return {
    jobsFetched: state.rawJobs.length,
    jobsParsed: state.normalizedJobs.length,
    jobsScored: state.normalizedJobs.length,
    usingDemoData: true,
  };
}

export async function runPipeline(trigger: PipelineTrigger = "manual") {
  if (!flags.hasDatabase) {
    return runDemoPipeline(trigger);
  }

  const stateSnapshot = await loadAppState();
  if (stateSnapshot.usingDemoData) {
    return runDemoPipeline(trigger);
  }

  const pipelineRun = await prisma.pipelineRun.create({
    data: {
      trigger,
      status: "running",
      message: "Collecting jobs from enabled curated sources.",
    },
  });

  try {
    const sources = await prisma.jobSource.findMany({ where: { enabled: true } });
    const normalizedJobs: NormalizedJob[] = [];
    const rawJobs: RawJobPosting[] = [];
    let jobsFetched = 0;

    for (const sourceRecord of sources) {
      const source: JobSource = {
        ...sourceRecord,
        type: sourceRecord.type as "greenhouse" | "lever" | "static",
        lastFetchStatus: sourceRecord.lastFetchStatus as JobSource["lastFetchStatus"],
        selectorConfig:
          (sourceRecord.selectorConfig as Record<string, unknown> | null) ?? null,
      };

      try {
        const fetchedJobs = await fetchJobsForSource(source);
        jobsFetched += fetchedJobs.length;

        for (const fetchedJob of fetchedJobs) {
          const contentHash = hashContent(
            [
              source.id,
              fetchedJob.url,
              fetchedJob.title,
              fetchedJob.company,
              fetchedJob.location,
              fetchedJob.description,
            ].join("|"),
          );

          const raw = await prisma.rawJobPosting.upsert({
            where: {
              sourceId_url: {
                sourceId: source.id,
                url: fetchedJob.url,
              },
            },
            update: {
              sourceJobId: fetchedJob.sourceJobId,
              rawTitle: fetchedJob.title,
              rawCompany: fetchedJob.company,
              rawLocation: fetchedJob.location,
              rawDescription: fetchedJob.description,
              postedAtRaw: fetchedJob.postedAtRaw,
              fetchedAt: new Date(),
              contentHash,
            },
            create: {
              sourceId: source.id,
              sourceJobId: fetchedJob.sourceJobId,
              url: fetchedJob.url,
              rawTitle: fetchedJob.title,
              rawCompany: fetchedJob.company,
              rawLocation: fetchedJob.location,
              rawDescription: fetchedJob.description,
              postedAtRaw: fetchedJob.postedAtRaw,
              fetchedAt: new Date(),
              contentHash,
            },
          });

          rawJobs.push(raw);

          const normalizedInput: NormalizedJobInput = await normalizeRawJob(raw);

          const normalized = await prisma.normalizedJob.upsert({
            where: { rawJobPostingId: raw.id },
            update: normalizedInput,
            create: normalizedInput,
          });

          normalizedJobs.push({
            ...normalized,
            remoteType: normalized.remoteType as NormalizedJob["remoteType"],
            seniority: normalized.seniority as NormalizedJob["seniority"],
            sponsorshipStatus:
              normalized.sponsorshipStatus as NormalizedJob["sponsorshipStatus"],
            status: normalized.status as NormalizedJob["status"],
          });
        }

        await prisma.jobSource.update({
          where: { id: source.id },
          data: {
            lastFetchedAt: new Date(),
            lastFetchStatus: "success",
            lastFetchMessage: `Fetched ${fetchedJobs.length} jobs.`,
          },
        });
      } catch (error) {
        await prisma.jobSource.update({
          where: { id: source.id },
          data: {
            lastFetchedAt: new Date(),
            lastFetchStatus: "failed",
            lastFetchMessage:
              error instanceof Error ? error.message : "Unknown fetch failure.",
          },
        });
      }
    }

    const deduped = dedupeStatuses(normalizedJobs);
    await Promise.all(
      deduped.map((job) =>
        prisma.normalizedJob.update({
          where: { id: job.id },
          data: { status: job.status },
        }),
      ),
    );

    const { state } = await loadAppState();
    const feedbackSignals = buildFeedbackSignals(
      state.feedbackEvents,
      deduped,
    );
    const rawById = new Map(state.rawJobs.map((job) => [job.id, job]));

    const matchResults = deduped.map((job) =>
      buildMatchResult(
        job,
        rawById.get(job.rawJobPostingId)!,
        state.candidateProfile,
        state.preferences,
        feedbackSignals,
        pipelineRun.id,
      ),
    );

    await saveDerivedMatches(matchResults, pipelineRun.id);

    await prisma.pipelineRun.update({
      where: { id: pipelineRun.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        jobsFetched,
        jobsParsed: deduped.length,
        jobsScored: matchResults.length,
        message: "Curated job sources refreshed and rankings recomputed.",
      },
    });

    return {
      jobsFetched,
      jobsParsed: deduped.length,
      jobsScored: matchResults.length,
      usingDemoData: false,
    };
  } catch (error) {
    await prisma.pipelineRun.update({
      where: { id: pipelineRun.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        message: error instanceof Error ? error.message : "Pipeline failure.",
      },
    });

    throw error;
  }
}
