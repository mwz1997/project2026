import { NextResponse } from "next/server";

import { saveFeedback } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    normalizedJobId?: string;
    feedbackType?: "up" | "down";
  };

  if (!body.normalizedJobId || !body.feedbackType) {
    return NextResponse.json({ error: "Missing feedback payload" }, { status: 400 });
  }

  await saveFeedback(body.normalizedJobId, body.feedbackType);
  return NextResponse.json({ ok: true });
}
