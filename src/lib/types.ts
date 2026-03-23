export type Seniority = "entry" | "mid" | "senior" | "staff" | "principal";
export type RemotePolicy = "onsite" | "hybrid" | "remote" | "flexible";
export type RemoteType = "onsite" | "hybrid" | "remote" | "unknown";
export type SponsorshipStatus = "yes" | "no" | "unknown";
export type JobStatus = "active" | "stale" | "expired";
export type RecommendationBucket =
  | "apply_now"
  | "review"
  | "stretch"
  | "skip";
export type FeedbackType = "up" | "down";
export type JobSourceType = "greenhouse" | "lever" | "static";
export type PipelineStatus = "idle" | "running" | "success" | "failed";
export type PipelineTrigger = "manual" | "cron";

export type CandidateProfile = {
  id: string;
  resumeFilename?: string | null;
  sourceFileType?: string | null;
  rawResumeText: string;
  skills: string[];
  roles: string[];
  industries: string[];
  tools: string[];
  education: string[];
  domains: string[];
  yearsExperience?: number | null;
  seniorityEstimate?: Seniority | null;
  parseConfidence?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CandidateProfileInput = Omit<
  CandidateProfile,
  "id" | "createdAt" | "updatedAt"
>;

export type UserPreferences = {
  id: string;
  targetRoles: string[];
  industries: string[];
  locations: string[];
  remotePolicy?: RemotePolicy | null;
  salaryMin?: number | null;
  sponsorshipRequired: boolean;
  seniority?: Seniority | null;
  keywordsInclude: string[];
  keywordsExclude: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type UserPreferencesInput = Omit<
  UserPreferences,
  "id" | "createdAt" | "updatedAt"
>;

export type JobSource = {
  id: string;
  name: string;
  type: JobSourceType;
  baseUrl: string;
  enabled: boolean;
  fetchStrategy?: string | null;
  selectorConfig?: Record<string, unknown> | null;
  lastFetchedAt?: Date | null;
  lastFetchStatus?: PipelineStatus | null;
  lastFetchMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RawJobPosting = {
  id: string;
  sourceId: string;
  sourceJobId?: string | null;
  url: string;
  rawTitle: string;
  rawCompany: string;
  rawLocation?: string | null;
  rawDescription: string;
  postedAtRaw?: string | null;
  fetchedAt: Date;
  contentHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RawJobPostingInput = Omit<
  RawJobPosting,
  "id" | "createdAt" | "updatedAt"
>;

export type NormalizedJob = {
  id: string;
  rawJobPostingId: string;
  titleNormalized: string;
  company: string;
  locationNormalized?: string | null;
  remoteType?: RemoteType | null;
  skillsRequired: string[];
  skillsPreferred: string[];
  industry?: string | null;
  seniority?: Seniority | null;
  sponsorshipStatus: SponsorshipStatus;
  salaryMin?: number | null;
  salaryMax?: number | null;
  postedAt?: Date | null;
  parseConfidence?: number | null;
  status: JobStatus;
  confidenceFlags: string[];
  hiddenMatch: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type NormalizedJobInput = Omit<
  NormalizedJob,
  "id" | "createdAt" | "updatedAt" | "hiddenMatch"
> & {
  hiddenMatch?: boolean;
};

export type ScoreBreakdown = {
  title: number;
  skills: number;
  industry: number;
  seniority: number;
  location: number;
  sponsorship: number;
  recency: number;
  keywordFit: number;
  feedbackAdjustment: number;
};

export type MatchResult = {
  id: string;
  normalizedJobId: string;
  pipelineRunId?: string | null;
  matchScore: number;
  confidenceScore: number;
  urgencyScore: number;
  bucket: RecommendationBucket;
  scoreBreakdown: ScoreBreakdown;
  fitSummary: string;
  missingSkills: string[];
  reasoning: string[];
  blockingReasons: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type MatchResultInput = Omit<
  MatchResult,
  "id" | "createdAt" | "updatedAt"
>;

export type FeedbackEvent = {
  id: string;
  normalizedJobId: string;
  feedbackType: FeedbackType;
  createdAt: Date;
};

export type FeedbackEventInput = Omit<FeedbackEvent, "id" | "createdAt">;

export type PipelineRun = {
  id: string;
  trigger: PipelineTrigger;
  status: PipelineStatus;
  startedAt: Date;
  finishedAt?: Date | null;
  jobsFetched: number;
  jobsParsed: number;
  jobsScored: number;
  message?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PipelineRunInput = Omit<
  PipelineRun,
  "id" | "createdAt" | "updatedAt"
>;

export type SourceFetchJob = {
  sourceJobId?: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  description: string;
  postedAtRaw?: string;
};

export type FeedbackSignals = {
  likedCompanies: string[];
  dislikedCompanies: string[];
  likedRoleTokens: string[];
  dislikedRoleTokens: string[];
};

export type DashboardFilters = {
  bucket?: RecommendationBucket | "all";
  sourceId?: string | "all";
  company?: string | "all";
  location?: string | "all";
  feedback?: "all" | "up" | "down" | "none";
};

export type JobWithMatch = {
  job: NormalizedJob;
  rawJob: RawJobPosting;
  source: JobSource;
  match: MatchResult;
  feedback?: FeedbackType | null;
};

export type DashboardView = {
  candidateProfile: CandidateProfile | null;
  preferences: UserPreferences;
  jobs: JobWithMatch[];
  sources: JobSource[];
  lastPipelineRun: PipelineRun | null;
  usingDemoData: boolean;
};

export type AppState = {
  candidateProfile: CandidateProfile | null;
  preferences: UserPreferences;
  sources: JobSource[];
  rawJobs: RawJobPosting[];
  normalizedJobs: NormalizedJob[];
  matchResults: MatchResult[];
  feedbackEvents: FeedbackEvent[];
  pipelineRuns: PipelineRun[];
};

export const defaultPreferences: UserPreferencesInput = {
  targetRoles: ["Systems Engineer", "Integration Engineer", "EV Engineer"],
  industries: ["Automotive", "EV", "Robotics"],
  locations: ["US", "Remote", "NC", "CA"],
  remotePolicy: "flexible",
  salaryMin: 90000,
  sponsorshipRequired: true,
  seniority: "mid",
  keywordsInclude: ["CAN", "EVSE", "integration"],
  keywordsExclude: ["marketing", "sales"],
};
