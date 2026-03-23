import { NextResponse } from "next/server";

import { runPipeline } from "@/lib/pipeline";

export async function POST() {
  const result = await runPipeline("manual");
  return NextResponse.json({ ok: true, ...result });
}
