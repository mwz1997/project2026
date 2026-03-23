import { randomUUID } from "node:crypto";

import { flags } from "@/lib/env";
import { buildDemoState } from "@/lib/demo-data";
import {
  buildFeedbackSignals,
  buildMatchResult,
  sortDashboardJobs,
} from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import type {
  AppState,
  CandidateProfileInput,
  DashboardFilters,
  DashboardView,
  FeedbackType,
  JobSource,
  JobWithMatch,
  MatchResult,
  Seniority,
  UserPreferences,
  UserPreferencesInput,
} from "@/lib/types";
import { defaultPreferences, type MatchResultInput } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

declare global {
  var __demoStore__: AppState | undefined;
}

function getDemoStore() {
  if (!globalThis.__demoStore__) {
    globalThis.__demoStore__ = buildDemoState();
  }

  return globalThis.__demoStore__;
}

function newestFeedbackMap(state: AppState) {
  const sorted = [...state.feedbackEvents].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const map = new Map<string, FeedbackType>();

  for (const event of sorted) {
    if (!map.has(event.normalizedJobId)) {
      map.set(event.normalizedJobId, event.feedbackType);
    }
  }

  return map;
}

function deriveMatchResults(state: AppState): MatchResult[] {
  const feedbackSignals = buildFeedbackSignals(
    state.feedbackEvents,
    state.normalizedJobs,
  );

  const rawById = new Map(state.rawJobs.map((job) => [job.id, job]));

  return state.normalizedJobs.map((job, index) => {
    const rawJob = rawById.get(job.rawJobPostingId);

    if (!rawJob) {
      throw new Error(`Missing raw job for normalized job ${job.id}`);
    }

    const result = buildMatchResult(
      job,
      rawJob,
      state.candidateProfile,
      state.preferences,
      feedbackSignals,
      state.pipelineRuns[0]?.id ?? null,
    );

    return {
      id: `match_${job.id}_${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...result,
    };
  });
}

function buildJobCards(state: AppState) {
  const feedbackMap = newestFeedbackMap(state);
  const sourceById = new Map(state.sources.map((source) => [source.id, source]));
  const rawById = new Map(state.rawJobs.map((job) => [job.id, job]));
  const matchByJobId = new Map(
    (state.matchResults.length ? state.matchResults : deriveMatchResults(state)).map(
      (match) => [match.normalizedJobId, match],
    ),
  );

  const jobs: JobWithMatch[] = state.normalizedJobs
    .map((job) => {
      const rawJob = rawById.get(job.rawJobPostingId);
      const source = rawJob ? sourceById.get(rawJob.sourceId) : null;
      const match = matchByJobId.get(job.id);

      if (!rawJob || !source || !match) {
        return null;
      }

      return {
        job,
        rawJob,
        source,
        match,
        feedback: feedbackMap.get(job.id) ?? null,
      };
    })
    .filter(Boolean) as JobWithMatch[];

  return sortDashboardJobs(jobs);
}

function applyFilters(jobs: JobWithMatch[], filters?: DashboardFilters) {
  if (!filters) {
    return jobs;
  }

  return jobs.filter((entry) => {
    if (filters.bucket && filters.bucket !== "all" && entry.match.bucket !== filters.bucket) {
      return false;
    }

    if (filters.sourceId && filters.sourceId !== "all" && entry.source.id !== filters.sourceId) {
      return false;
    }

    if (filters.company && filters.company !== "all") {
      const companyFilter = normalizeText(filters.company);
      if (normalizeText(entry.job.company) !== companyFilter) {
        return false;
      }
    }

    if (filters.location && filters.location !== "all") {
      const locationFilter = normalizeText(filters.location);
      if (!normalizeText(entry.job.locationNormalized).includes(locationFilter)) {
        return false;
      }
    }

    if (filters.feedback && filters.feedback !== "all") {
      if (filters.feedback === "none" && entry.feedback) {
        return false;
      }

      if (filters.feedback !== "none" && entry.feedback !== filters.feedback) {
        return false;
      }
    }

    return true;
  });
}

function mapDbStateToAppState(state: {
  candidateProfile: Awaited<ReturnType<typeof prisma.candidateProfile.findFirst>>;
  preferences: Awaited<ReturnType<typeof prisma.userPreferences.findFirst>>;
  sources: Awaited<ReturnType<typeof prisma.jobSource.findMany>>;
  rawJobs: Awaited<ReturnType<typeof prisma.rawJobPosting.findMany>>;
  normalizedJobs: Awaited<ReturnType<typeof prisma.normalizedJob.findMany>>;
  matchResults: Awaited<ReturnType<typeof prisma.matchResult.findMany>>;
  feedbackEvents: Awaited<ReturnType<typeof prisma.feedbackEvent.findMany>>;
  pipelineRuns: Awaited<ReturnType<typeof prisma.pipelineRun.findMany>>;
}): AppState {
  return {
    candidateProfile: state.candidateProfile
      ? {
          ...state.candidateProfile,
          seniorityEstimate: (state.candidateProfile.seniorityEstimate as Seniority | null) ?? null,
        }
      : null,
    preferences: state.preferences
      ? {
          ...state.preferences,
          remotePolicy: state.preferences.remotePolicy as UserPreferences["remotePolicy"],
          seniority: state.preferences.seniority as UserPreferences["seniority"],
        }
      : {
          id: "preferences_default",
          ...defaultPreferences,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
    sources: state.sources.map((source) => ({
      ...source,
      type: source.type as JobSource["type"],
      lastFetchStatus: source.lastFetchStatus as JobSource["lastFetchStatus"],
      selectorConfig: (source.selectorConfig as Record<string, unknown> | null) ?? null,
    })),
    rawJobs: state.rawJobs,
    normalizedJobs: state.normalizedJobs.map((job) => ({
      ...job,
      remoteType: job.remoteType as AppState["normalizedJobs"][number]["remoteType"],
      seniority: job.seniority as AppState["normalizedJobs"][number]["seniority"],
      sponsorshipStatus:
        job.sponsorshipStatus as AppState["normalizedJobs"][number]["sponsorshipStatus"],
      status: job.status as AppState["normalizedJobs"][number]["status"],
    })),
    matchResults: state.matchResults.map((match) => ({
      ...match,
      bucket: match.bucket as MatchResult["bucket"],
      scoreBreakdown: match.scoreBreakdown as MatchResult["scoreBreakdown"],
    })),
    feedbackEvents: state.feedbackEvents.map((event) => ({
      ...event,
      feedbackType: event.feedbackType as FeedbackType,
    })),
    pipelineRuns: state.pipelineRuns.map((run) => ({
      ...run,
      trigger: run.trigger as AppState["pipelineRuns"][number]["trigger"],
      status: run.status as AppState["pipelineRuns"][number]["status"],
    })),
  };
}

async function loadDatabaseState() {
  const [
    candidateProfile,
    preferences,
    sources,
    rawJobs,
    normalizedJobs,
    matchResults,
    feedbackEvents,
    pipelineRuns,
  ] = await prisma.$transaction([
    prisma.candidateProfile.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.userPreferences.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.jobSource.findMany({ orderBy: { name: "asc" } }),
    prisma.rawJobPosting.findMany(),
    prisma.normalizedJob.findMany(),
    prisma.matchResult.findMany(),
    prisma.feedbackEvent.findMany(),
    prisma.pipelineRun.findMany({ orderBy: { startedAt: "desc" } }),
  ]);

  return mapDbStateToAppState({
    candidateProfile,
    preferences,
    sources,
    rawJobs,
    normalizedJobs,
    matchResults,
    feedbackEvents,
    pipelineRuns,
  });
}

export async function loadAppState() {
  if (!flags.hasDatabase) {
    return { state: getDemoStore(), usingDemoData: true };
  }

  try {
    const state = await loadDatabaseState();
    return { state, usingDemoData: false };
  } catch {
    return { state: getDemoStore(), usingDemoData: true };
  }
}

export async function getDashboardView(
  filters?: DashboardFilters,
): Promise<DashboardView> {
  const { state, usingDemoData } = await loadAppState();
  const jobs = applyFilters(buildJobCards(state), filters);

  return {
    candidateProfile: state.candidateProfile,
    preferences: state.preferences,
    jobs,
    sources: state.sources,
    lastPipelineRun: state.pipelineRuns[0] ?? null,
    usingDemoData,
  };
}

export async function getJobDetail(jobId: string) {
  const { state, usingDemoData } = await loadAppState();
  const job = buildJobCards(state).find((entry) => entry.job.id === jobId) ?? null;
  return { job, usingDemoData };
}

export async function saveCandidateProfile(input: CandidateProfileInput) {
  if (!flags.hasDatabase) {
    const store = getDemoStore();
    store.candidateProfile = {
      id: store.candidateProfile?.id ?? "candidate_demo",
      createdAt: store.candidateProfile?.createdAt ?? new Date(),
      updatedAt: new Date(),
      ...input,
    };
    return store.candidateProfile;
  }

  const existing = await prisma.candidateProfile.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    return prisma.candidateProfile.update({
      where: { id: existing.id },
      data: input,
    });
  }

  return prisma.candidateProfile.create({ data: input });
}

export async function saveUserPreferences(input: UserPreferencesInput) {
  if (!flags.hasDatabase) {
    const store = getDemoStore();
    store.preferences = {
      id: store.preferences.id,
      createdAt: store.preferences.createdAt,
      updatedAt: new Date(),
      ...input,
    };
    return store.preferences;
  }

  const existing = await prisma.userPreferences.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    return prisma.userPreferences.update({
      where: { id: existing.id },
      data: input,
    });
  }

  return prisma.userPreferences.create({ data: input });
}

export async function saveFeedback(normalizedJobId: string, feedbackType: FeedbackType) {
  if (!flags.hasDatabase) {
    const store = getDemoStore();
    store.feedbackEvents.unshift({
      id: randomUUID(),
      normalizedJobId,
      feedbackType,
      createdAt: new Date(),
    });
    return;
  }

  await prisma.feedbackEvent.create({
    data: {
      normalizedJobId,
      feedbackType,
    },
  });
}

export async function saveDerivedMatches(
  matches: MatchResultInput[],
  pipelineRunId?: string | null,
) {
  if (!flags.hasDatabase) {
    const store = getDemoStore();
    store.matchResults = matches.map((match, index) => ({
      id: `match_demo_${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...match,
      pipelineRunId: pipelineRunId ?? match.pipelineRunId ?? null,
    }));
    return;
  }

  await Promise.all(
    matches.map((match) =>
      prisma.matchResult.upsert({
        where: { normalizedJobId: match.normalizedJobId },
        update: {
          ...match,
          pipelineRunId: pipelineRunId ?? match.pipelineRunId ?? null,
        },
        create: {
          ...match,
          pipelineRunId: pipelineRunId ?? match.pipelineRunId ?? null,
        },
      }),
    ),
  );
}

export function getMutableDemoStore() {
  return getDemoStore();
}
