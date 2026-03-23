import { Prisma, PrismaClient } from "@prisma/client";

import { buildDemoState } from "../src/lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  const demo = buildDemoState();

  await prisma.feedbackEvent.deleteMany();
  await prisma.matchResult.deleteMany();
  await prisma.normalizedJob.deleteMany();
  await prisma.rawJobPosting.deleteMany();
  await prisma.jobSource.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.pipelineRun.deleteMany();

  await prisma.candidateProfile.create({
    data: {
      ...demo.candidateProfile!,
      id: undefined,
    },
  });

  await prisma.userPreferences.create({
    data: {
      ...demo.preferences,
      id: undefined,
    },
  });

  for (const source of demo.sources) {
    await prisma.jobSource.create({
      data: {
        id: source.id,
        name: source.name,
        type: source.type,
        baseUrl: source.baseUrl,
        enabled: source.enabled,
        fetchStrategy: source.fetchStrategy ?? undefined,
        selectorConfig:
          (source.selectorConfig as Prisma.InputJsonValue | undefined) ?? undefined,
        lastFetchedAt: source.lastFetchedAt ?? undefined,
        lastFetchStatus: source.lastFetchStatus ?? undefined,
        lastFetchMessage: source.lastFetchMessage ?? undefined,
      },
    });
  }

  for (const rawJob of demo.rawJobs) {
    await prisma.rawJobPosting.create({
      data: rawJob,
    });
  }

  for (const job of demo.normalizedJobs) {
    await prisma.normalizedJob.create({
      data: job,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
