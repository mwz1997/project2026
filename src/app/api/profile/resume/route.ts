import { NextResponse } from "next/server";

import { extractResumeText, parseResumeTextToProfile } from "@/lib/resume-parser";
import { saveCandidateProfile } from "@/lib/store";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("resume");

  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ error: "Resume file is required" }, { status: 400 });
  }

  const text = await extractResumeText(file);
  const profile = await parseResumeTextToProfile(text, {
    fileName: file.name,
    mimeType: file.type,
  });

  const saved = await saveCandidateProfile(profile);
  return NextResponse.json({ ok: true, profile: saved });
}
