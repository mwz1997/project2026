import { NextResponse } from "next/server";

import { getDashboardView } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = await getDashboardView({
    bucket: (searchParams.get("bucket") as never) || "all",
    sourceId: searchParams.get("sourceId") || "all",
    company: searchParams.get("company") || "all",
    location: searchParams.get("location") || "all",
    feedback: (searchParams.get("feedback") as never) || "all",
  });

  return NextResponse.json({
    usingDemoData: view.usingDemoData,
    lastPipelineRun: view.lastPipelineRun,
    jobs: view.jobs,
  });
}
