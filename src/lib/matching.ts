import crypto from "node:crypto";
import { z } from "zod";

import { generateStructuredObject } from "@/lib/openai";
import {
  type CandidateProfile,
  type FeedbackEvent,
  type FeedbackSignals,
  type JobWithMatch,
  type MatchResultInput,
  type NormalizedJob,
  type NormalizedJobInput,
  type RawJobPosting,
  type RecommendationBucket,
  type ScoreBreakdown,
  type SponsorshipStatus,
  type UserPreferences,
} from "@/lib/types";
import { clamp, normalizeText, titleCase, unique } from "@/lib/utils";

const jobSchema = z.object({
  titleNormalized: z.string(),
  skillsRequired: z.array(z.string()),
  skillsPreferred: z.array(z.string()),
  seniority: z
    .enum(["entry", "mid", "senior", "staff", "principal"])
    .nullable(),
  industry: z.string().nullable(),
  sponsorshipStatus: z.enum(["yes", "no", "unknown"]),
  remoteType: z.enum(["onsite", "hybrid", "remote", "unknown"]).nullable(),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  parseConfidence: z.number().min(0).max(100),
  confidenceFlags: z.array(z.string()),
});

const commonSkills = [
  "CAN",
  "J1939",
  "AUTOSAR",
  "HIL",
  "EVSE",
  "Validation",
  "Integration",
  "Diagnostics",
  "Python",
  "C++",
  "MATLAB",
  "Embedded",
  "Systems",
  "Robotics",
];

function tokenize(input: string) {
  return normalizeText(input)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function tokenOverlap(a: string[], b: string[]) {
  const setB = new Set(b);
  return a.filter((token) => setB.has(token)).length;
}

function inferTitle(title: string) {
  const lower = normalizeText(title);

  if (lower.includes("integration")) return "Systems Integration Engineer";
  if (lower.includes("validation")) return "Validation Engineer";
  if (lower.includes("evse")) return "EVSE Systems Engineer";
  if (lower.includes("systems")) return "Systems Engineer";

  return titleCase(title);
}

function inferSeniority(text: string) {
  const lower = normalizeText(text);
  if (lower.includes("principal")) return "principal";
  if (lower.includes("staff")) return "staff";
  if (lower.includes("senior")) return "senior";
  if (lower.includes("junior") || lower.includes("entry")) return "entry";
  return "mid";
}

function inferIndustry(text: string) {
  const lower = normalizeText(text);
  if (lower.includes("robot")) return "Robotics";
  if (lower.includes("battery") || lower.includes("charger") || lower.includes("ev")) {
    return "EV";
  }
  if (lower.includes("vehicle") || lower.includes("automotive")) return "Automotive";
  return "Systems";
}

function inferRemoteType(text: string, location: string | null | undefined) {
  const merged = `${text}\n${location ?? ""}`.toLowerCase();
  if (merged.includes("remote")) return "remote";
  if (merged.includes("hybrid")) return "hybrid";
  if (location) return "onsite";
  return "unknown";
}

function inferSponsorship(text: string): SponsorshipStatus {
  const lower = normalizeText(text);
  if (lower.includes("no sponsorship") || lower.includes("unable to sponsor")) {
    return "no";
  }
  if (lower.includes("sponsorship available") || lower.includes("visa support")) {
    return "yes";
  }
  return "unknown";
}

function inferSkills(text: string) {
  const lower = normalizeText(text);
  return commonSkills.filter((skill) => lower.includes(skill.toLowerCase()));
}

function inferSalary(text: string) {
  const numbers = [
    ...text.matchAll(/\$?(\d{2,3})(?:,?000)?\s*-\s*\$?(\d{2,3})(?:,?000)?/g),
  ];

  if (!numbers[0]) {
    return { salaryMin: null, salaryMax: null };
  }

  const [, rawMin, rawMax] = numbers[0];
  const salaryMin = Number(rawMin) < 1000 ? Number(rawMin) * 1000 : Number(rawMin);
  const salaryMax = Number(rawMax) < 1000 ? Number(rawMax) * 1000 : Number(rawMax);
  return { salaryMin, salaryMax };
}

export function hashContent(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function normalizeRawJob(rawJob: RawJobPosting): Promise<NormalizedJobInput> {
  const heuristicSkills = inferSkills(`${rawJob.rawTitle}\n${rawJob.rawDescription}`);
  const heuristicSalary = inferSalary(rawJob.rawDescription);

  const heuristic: NormalizedJobInput = {
    rawJobPostingId: rawJob.id,
    titleNormalized: inferTitle(rawJob.rawTitle),
    company: rawJob.rawCompany,
    locationNormalized: rawJob.rawLocation ?? null,
    remoteType: inferRemoteType(rawJob.rawDescription, rawJob.rawLocation),
    skillsRequired: heuristicSkills.slice(0, 5),
    skillsPreferred: heuristicSkills.slice(5),
    industry: inferIndustry(rawJob.rawDescription),
    seniority: inferSeniority(`${rawJob.rawTitle}\n${rawJob.rawDescription}`),
    sponsorshipStatus: inferSponsorship(rawJob.rawDescription),
    salaryMin: heuristicSalary.salaryMin,
    salaryMax: heuristicSalary.salaryMax,
    postedAt: rawJob.postedAtRaw ? new Date(rawJob.postedAtRaw) : null,
    parseConfidence: 76,
    status: "active",
    confidenceFlags: [],
  };

  const llm = await generateStructuredObject({
    name: "normalized_job",
    system:
      "Extract a normalized engineering job profile. Use exact evidence when possible and set uncertainty via confidenceFlags.",
    user: `${rawJob.rawTitle}\n${rawJob.rawCompany}\n${rawJob.rawLocation ?? ""}\n\n${rawJob.rawDescription}`,
    schema: jobSchema,
  });

  return {
    ...heuristic,
    titleNormalized: llm?.titleNormalized ?? heuristic.titleNormalized,
    skillsRequired: unique((llm?.skillsRequired ?? heuristic.skillsRequired).map(titleCase)),
    skillsPreferred: unique(
      (llm?.skillsPreferred ?? heuristic.skillsPreferred).map(titleCase),
    ),
    industry: llm?.industry ? titleCase(llm.industry) : heuristic.industry,
    seniority: llm?.seniority ?? heuristic.seniority,
    sponsorshipStatus: llm?.sponsorshipStatus ?? heuristic.sponsorshipStatus,
    remoteType: llm?.remoteType ?? heuristic.remoteType,
    salaryMin: llm?.salaryMin ?? heuristic.salaryMin,
    salaryMax: llm?.salaryMax ?? heuristic.salaryMax,
    parseConfidence: llm?.parseConfidence ?? heuristic.parseConfidence,
    confidenceFlags: unique(llm?.confidenceFlags ?? heuristic.confidenceFlags),
  };
}

export function dedupeNormalizedJobs(jobs: NormalizedJobInput[]) {
  const seen = new Map<string, NormalizedJobInput>();

  for (const job of jobs) {
    const key = [
      normalizeText(job.company),
      normalizeText(job.titleNormalized),
      normalizeText(job.locationNormalized ?? ""),
    ].join("|");

    if (!seen.has(key)) {
      seen.set(key, job);
    }
  }

  return [...seen.values()];
}

export function buildFeedbackSignals(
  feedbackEvents: FeedbackEvent[],
  jobs: NormalizedJob[],
): FeedbackSignals {
  const likedCompanies = new Set<string>();
  const dislikedCompanies = new Set<string>();
  const likedRoleTokens = new Set<string>();
  const dislikedRoleTokens = new Set<string>();

  for (const event of feedbackEvents) {
    const job = jobs.find((entry) => entry.id === event.normalizedJobId);

    if (!job) continue;

    const companySet =
      event.feedbackType === "up" ? likedCompanies : dislikedCompanies;
    const tokenSet =
      event.feedbackType === "up" ? likedRoleTokens : dislikedRoleTokens;

    companySet.add(job.company);
    tokenize(job.titleNormalized).forEach((token) => tokenSet.add(token));
  }

  return {
    likedCompanies: [...likedCompanies],
    dislikedCompanies: [...dislikedCompanies],
    likedRoleTokens: [...likedRoleTokens],
    dislikedRoleTokens: [...dislikedRoleTokens],
  };
}

function scoreTitle(
  job: NormalizedJob,
  profile: CandidateProfile | null,
  prefs: UserPreferences,
) {
  const jobTokens = tokenize(job.titleNormalized);
  const targetTokens = unique(
    [...prefs.targetRoles, ...(profile?.roles ?? [])].flatMap(tokenize),
  );
  const overlap = tokenOverlap(jobTokens, targetTokens);

  if (!targetTokens.length) return 10;

  return clamp(Math.round((overlap / Math.max(jobTokens.length, 1)) * 20), 0, 20);
}

function scoreSkills(job: NormalizedJob, profile: CandidateProfile | null) {
  const candidateSkills = unique([
    ...(profile?.skills ?? []),
    ...(profile?.tools ?? []),
  ]).map(normalizeText);

  const required = job.skillsRequired.map(normalizeText);
  const preferred = job.skillsPreferred.map(normalizeText);
  const requiredHits = required.filter((skill) => candidateSkills.includes(skill)).length;
  const preferredHits = preferred.filter((skill) => candidateSkills.includes(skill)).length;

  if (!required.length && !preferred.length) return 18;

  const requiredScore = required.length
    ? Math.round((requiredHits / required.length) * 22)
    : 12;
  const preferredScore = preferred.length
    ? Math.round((preferredHits / preferred.length) * 8)
    : 4;

  return clamp(requiredScore + preferredScore, 0, 30);
}

function scoreIndustry(
  job: NormalizedJob,
  profile: CandidateProfile | null,
  prefs: UserPreferences,
) {
  const targets = unique([
    ...(prefs.industries ?? []),
    ...(profile?.industries ?? []),
  ]).map(normalizeText);

  if (!job.industry) return 4;

  return targets.includes(normalizeText(job.industry)) ? 10 : 2;
}

function scoreSeniority(
  job: NormalizedJob,
  profile: CandidateProfile | null,
  prefs: UserPreferences,
) {
  const target = prefs.seniority ?? profile?.seniorityEstimate ?? "mid";
  if (!job.seniority) return 6;
  if (job.seniority === target) return 10;

  const order = ["entry", "mid", "senior", "staff", "principal"];
  const delta =
    Math.abs(order.indexOf(job.seniority) - order.indexOf(target));
  return clamp(10 - delta * 4, 0, 10);
}

function scoreLocation(job: NormalizedJob, prefs: UserPreferences) {
  const locations = prefs.locations.map(normalizeText);
  const location = normalizeText(job.locationNormalized ?? "");

  if (job.remoteType === "remote" && locations.some((entry) => entry.includes("remote"))) {
    return 10;
  }

  if (!location) return 5;

  return locations.some((entry) => location.includes(entry)) ? 10 : 2;
}

function scoreSponsorship(job: NormalizedJob, prefs: UserPreferences) {
  if (!prefs.sponsorshipRequired) {
    return job.sponsorshipStatus === "no" ? 6 : 10;
  }

  if (job.sponsorshipStatus === "yes") return 10;
  if (job.sponsorshipStatus === "unknown") return 5;
  return 0;
}

function scoreRecency(job: NormalizedJob) {
  if (!job.postedAt) return 2;
  const hours = (Date.now() - job.postedAt.getTime()) / (60 * 60 * 1000);
  if (hours <= 24) return 5;
  if (hours <= 72) return 4;
  if (hours <= 168) return 3;
  if (hours <= 336) return 2;
  return 1;
}

function scoreKeywordFit(
  job: NormalizedJob,
  rawJob: RawJobPosting,
  prefs: UserPreferences,
) {
  const haystack =
    `${job.titleNormalized}\n${job.skillsRequired.join(" ")}\n${rawJob.rawDescription}`.toLowerCase();
  const includeHits = prefs.keywordsInclude.filter((keyword) =>
    haystack.includes(keyword.toLowerCase()),
  ).length;

  if (!prefs.keywordsInclude.length) return 3;

  return clamp(Math.round((includeHits / prefs.keywordsInclude.length) * 5), 0, 5);
}

function scoreFeedback(job: NormalizedJob, feedbackSignals: FeedbackSignals) {
  let adjustment = 0;

  if (feedbackSignals.likedCompanies.includes(job.company)) adjustment += 3;
  if (feedbackSignals.dislikedCompanies.includes(job.company)) adjustment -= 3;

  const titleTokens = tokenize(job.titleNormalized);
  if (titleTokens.some((token) => feedbackSignals.likedRoleTokens.includes(token))) {
    adjustment += 2;
  }
  if (
    titleTokens.some((token) => feedbackSignals.dislikedRoleTokens.includes(token))
  ) {
    adjustment -= 2;
  }

  return clamp(adjustment, -5, 5);
}

function getBlockingReasons(job: NormalizedJob, rawJob: RawJobPosting, prefs: UserPreferences) {
  const blockers: string[] = [];
  const haystack = `${job.titleNormalized}\n${rawJob.rawDescription}`.toLowerCase();

  if (
    prefs.keywordsExclude.some((keyword) =>
      haystack.includes(keyword.toLowerCase()),
    )
  ) {
    blockers.push("Contains excluded keywords.");
  }

  if (
    prefs.salaryMin != null &&
    job.salaryMax != null &&
    job.salaryMax < prefs.salaryMin
  ) {
    blockers.push("Compensation appears below the target minimum.");
  }

  if (prefs.sponsorshipRequired && job.sponsorshipStatus === "no") {
    blockers.push("Role does not appear to offer sponsorship.");
  }

  const order = ["entry", "mid", "senior", "staff", "principal"];
  const targetIndex = order.indexOf(prefs.seniority ?? "mid");
  const roleIndex = order.indexOf(job.seniority ?? "mid");
  if (roleIndex - targetIndex >= 2) {
    blockers.push("Role seniority looks above the current target range.");
  }

  return blockers;
}

export function computeUrgency(job: NormalizedJob, rawJob: RawJobPosting) {
  let score = 20;

  if (job.postedAt) {
    const hours = (Date.now() - job.postedAt.getTime()) / (60 * 60 * 1000);
    score += clamp(60 - hours, 0, 60);
  }

  const lower = rawJob.rawDescription.toLowerCase();
  if (lower.includes("urgent") || lower.includes("immediate")) {
    score += 20;
  }

  return clamp(Math.round(score), 0, 100);
}

function computeConfidence(job: NormalizedJob, blockers: string[]) {
  let score = Math.round((job.parseConfidence ?? 70) * 0.7);
  score += Math.max(0, 30 - job.confidenceFlags.length * 8);
  if (blockers.length) score -= 10;
  return clamp(score, 0, 100);
}

function determineBucket(
  matchScore: number,
  confidenceScore: number,
  blockers: string[],
): RecommendationBucket {
  if (blockers.length || matchScore < 50) return "skip";
  if (matchScore >= 80 && confidenceScore >= 60) return "apply_now";
  if (matchScore >= 65) return "review";
  return "stretch";
}

export function buildMatchResult(
  job: NormalizedJob,
  rawJob: RawJobPosting,
  profile: CandidateProfile | null,
  prefs: UserPreferences,
  feedbackSignals: FeedbackSignals,
  pipelineRunId?: string | null,
): MatchResultInput {
  const blockingReasons = getBlockingReasons(job, rawJob, prefs);
  const breakdown: ScoreBreakdown = {
    title: scoreTitle(job, profile, prefs),
    skills: scoreSkills(job, profile),
    industry: scoreIndustry(job, profile, prefs),
    seniority: scoreSeniority(job, profile, prefs),
    location: scoreLocation(job, prefs),
    sponsorship: scoreSponsorship(job, prefs),
    recency: scoreRecency(job),
    keywordFit: scoreKeywordFit(job, rawJob, prefs),
    feedbackAdjustment: scoreFeedback(job, feedbackSignals),
  };

  const baseScore =
    breakdown.title +
    breakdown.skills +
    breakdown.industry +
    breakdown.seniority +
    breakdown.location +
    breakdown.sponsorship +
    breakdown.recency +
    breakdown.keywordFit;
  const matchScore = clamp(baseScore + breakdown.feedbackAdjustment, 0, 100);
  const confidenceScore = computeConfidence(job, blockingReasons);
  const urgencyScore = computeUrgency(job, rawJob);
  const bucket = determineBucket(matchScore, confidenceScore, blockingReasons);

  const candidateSkills = unique([
    ...(profile?.skills ?? []),
    ...(profile?.tools ?? []),
  ]).map(normalizeText);
  const missingSkills = unique(
    [...job.skillsRequired, ...job.skillsPreferred].filter(
      (skill) => !candidateSkills.includes(normalizeText(skill)),
    ),
  );

  const reasoning = [
    breakdown.title >= 12 ? "Title aligns closely with target roles." : null,
    breakdown.skills >= 20 ? "Strong overlap on required systems and integration skills." : null,
    breakdown.location >= 8 ? "Location fits the preferred search area." : null,
    job.sponsorshipStatus === "unknown" ? "Sponsorship is unclear from the posting." : null,
    breakdown.feedbackAdjustment > 0
      ? "Similar roles received positive feedback before."
      : null,
  ].filter(Boolean) as string[];

  const fitSummary = [
    `${job.titleNormalized} at ${job.company}`,
    `scores ${matchScore}/100`,
    missingSkills.length
      ? `gap areas: ${missingSkills.slice(0, 3).join(", ")}`
      : "few visible skill gaps",
  ].join(" • ");

  return {
    normalizedJobId: job.id,
    pipelineRunId: pipelineRunId ?? null,
    matchScore,
    confidenceScore,
    urgencyScore,
    bucket,
    scoreBreakdown: breakdown,
    fitSummary,
    missingSkills,
    reasoning,
    blockingReasons,
  };
}

export function sortDashboardJobs(jobs: JobWithMatch[]) {
  const bucketOrder: RecommendationBucket[] = [
    "apply_now",
    "review",
    "stretch",
    "skip",
  ];

  return [...jobs].sort((left, right) => {
    const bucketDelta =
      bucketOrder.indexOf(left.match.bucket) - bucketOrder.indexOf(right.match.bucket);
    if (bucketDelta !== 0) return bucketDelta;
    if (right.match.matchScore !== left.match.matchScore) {
      return right.match.matchScore - left.match.matchScore;
    }
    if (right.match.urgencyScore !== left.match.urgencyScore) {
      return right.match.urgencyScore - left.match.urgencyScore;
    }
    return (right.job.postedAt?.getTime() ?? 0) - (left.job.postedAt?.getTime() ?? 0);
  });
}
