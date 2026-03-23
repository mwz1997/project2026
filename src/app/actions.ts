"use server";

import { revalidatePath } from "next/cache";

import { runPipeline } from "@/lib/pipeline";
import { extractResumeText, parseResumeTextToProfile } from "@/lib/resume-parser";
import { saveCandidateProfile, saveFeedback, saveUserPreferences } from "@/lib/store";
import type { FeedbackType, RemotePolicy, Seniority } from "@/lib/types";
import { splitCsv } from "@/lib/utils";

export async function uploadResumeAction(formData: FormData) {
  const file = formData.get("resume");

  if (!(file instanceof File) || !file.size) {
    return;
  }

  const text = await extractResumeText(file);
  const profile = await parseResumeTextToProfile(text, {
    fileName: file.name,
    mimeType: file.type,
  });

  await saveCandidateProfile(profile);
  revalidatePath("/");
  revalidatePath("/profile");
}

export async function savePreferencesAction(formData: FormData) {
  await saveUserPreferences({
    targetRoles: splitCsv(String(formData.get("targetRoles") ?? "")),
    industries: splitCsv(String(formData.get("industries") ?? "")),
    locations: splitCsv(String(formData.get("locations") ?? "")),
    remotePolicy: (formData.get("remotePolicy") || null) as RemotePolicy | null,
    salaryMin: formData.get("salaryMin")
      ? Number(formData.get("salaryMin"))
      : null,
    sponsorshipRequired: formData.get("sponsorshipRequired") === "on",
    seniority: (formData.get("seniority") || null) as Seniority | null,
    keywordsInclude: splitCsv(String(formData.get("keywordsInclude") ?? "")),
    keywordsExclude: splitCsv(String(formData.get("keywordsExclude") ?? "")),
  });

  revalidatePath("/");
  revalidatePath("/profile");
}

export async function triggerPipelineAction() {
  await runPipeline("manual");
  revalidatePath("/");
  revalidatePath("/sources");
}

export async function submitFeedbackAction(formData: FormData) {
  const normalizedJobId = String(formData.get("normalizedJobId") ?? "");
  const feedbackType = String(formData.get("feedbackType") ?? "") as FeedbackType;

  if (!normalizedJobId || !["up", "down"].includes(feedbackType)) {
    return;
  }

  await saveFeedback(normalizedJobId, feedbackType);
  revalidatePath("/");
  revalidatePath(`/jobs/${normalizedJobId}`);
}
