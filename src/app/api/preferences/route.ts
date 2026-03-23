import { NextResponse } from "next/server";

import { saveUserPreferences } from "@/lib/store";
import type { UserPreferencesInput } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<UserPreferencesInput>;

  const saved = await saveUserPreferences({
    targetRoles: body.targetRoles ?? [],
    industries: body.industries ?? [],
    locations: body.locations ?? [],
    remotePolicy: body.remotePolicy ?? null,
    salaryMin: body.salaryMin ?? null,
    sponsorshipRequired: body.sponsorshipRequired ?? false,
    seniority: body.seniority ?? null,
    keywordsInclude: body.keywordsInclude ?? [],
    keywordsExclude: body.keywordsExclude ?? [],
  });

  return NextResponse.json({ ok: true, preferences: saved });
}
