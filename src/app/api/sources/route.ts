import { NextResponse } from "next/server";

import { getDashboardView } from "@/lib/store";

export async function GET() {
  const view = await getDashboardView();
  return NextResponse.json({
    usingDemoData: view.usingDemoData,
    sources: view.sources,
    lastPipelineRun: view.lastPipelineRun,
  });
}
