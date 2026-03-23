import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { z } from "zod";

import { generateStructuredObject } from "@/lib/openai";
import { type CandidateProfileInput, type Seniority } from "@/lib/types";
import { titleCase, unique } from "@/lib/utils";

const resumeSchema = z.object({
  skills: z.array(z.string()),
  roles: z.array(z.string()),
  industries: z.array(z.string()),
  tools: z.array(z.string()),
  education: z.array(z.string()),
  domains: z.array(z.string()),
  yearsExperience: z.number().int().min(0).max(50).nullable(),
  seniorityEstimate: z
    .enum(["entry", "mid", "senior", "staff", "principal"])
    .nullable(),
  parseConfidence: z.number().min(0).max(100),
});

const knownSkills = [
  "CAN",
  "J1939",
  "AUTOSAR",
  "HIL",
  "EVSE",
  "Python",
  "C++",
  "Validation",
  "Integration",
  "Diagnostics",
  "Embedded",
  "Controls",
];

const knownIndustries = ["Automotive", "EV", "Robotics", "Energy", "Embedded"];

const knownRoles = [
  "Systems Engineer",
  "Integration Engineer",
  "Validation Engineer",
  "EV Engineer",
  "Controls Engineer",
];

export async function extractResumeText(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    const parser = new PDFParse({ data: bytes });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text;
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const parsed = await mammoth.extractRawText({ buffer: bytes });
    return parsed.value;
  }

  return bytes.toString("utf-8");
}

function inferSeniority(text: string, yearsExperience: number | null): Seniority | null {
  const lower = text.toLowerCase();

  if (lower.includes("principal") || lower.includes("lead architect")) {
    return "principal";
  }

  if (lower.includes("staff")) {
    return "staff";
  }

  if (lower.includes("senior")) {
    return "senior";
  }

  if (yearsExperience != null) {
    if (yearsExperience >= 8) return "staff";
    if (yearsExperience >= 5) return "senior";
    if (yearsExperience >= 2) return "mid";
  }

  return "mid";
}

function heuristicResumeParse(text: string) {
  const normalized = text.toLowerCase();
  const yearsMatch = normalized.match(/(\d+)\+?\s+years?/);
  const yearsExperience = yearsMatch ? Number(yearsMatch[1]) : null;

  return {
    skills: unique(
      knownSkills.filter((skill) => normalized.includes(skill.toLowerCase())),
    ),
    roles: unique(knownRoles.filter((role) => normalized.includes(role.toLowerCase()))),
    industries: unique(
      knownIndustries.filter((industry) =>
        normalized.includes(industry.toLowerCase()),
      ),
    ),
    tools: unique(
      ["Python", "C++", "MATLAB", "Vector CANalyzer"].filter((tool) =>
        normalized.includes(tool.toLowerCase()),
      ),
    ),
    education: unique(
      ["BS", "MS", "PhD", "Electrical Engineering", "Mechanical Engineering"].filter(
        (token) => normalized.includes(token.toLowerCase()),
      ),
    ).map(titleCase),
    domains: unique(
      ["Vehicle systems", "Charging", "Embedded diagnostics", "Autonomy"].filter(
        (token) => normalized.includes(token.toLowerCase()),
      ),
    ),
    yearsExperience,
    seniorityEstimate: inferSeniority(normalized, yearsExperience),
    parseConfidence: 70,
  };
}

export async function parseResumeTextToProfile(
  text: string,
  meta?: { fileName?: string; mimeType?: string },
): Promise<CandidateProfileInput> {
  const heuristic = heuristicResumeParse(text);
  const llm = await generateStructuredObject({
    name: "candidate_profile",
    system:
      "Extract a resume into an ATS-style candidate profile. Use concise noun phrases and return only evidence-backed facts.",
    user: text,
    schema: resumeSchema,
  });

  const parsed = llm ?? heuristic;

  return {
    resumeFilename: meta?.fileName ?? null,
    sourceFileType: meta?.mimeType ?? null,
    rawResumeText: text,
    skills: unique(parsed.skills.map(titleCase)),
    roles: unique(parsed.roles.map(titleCase)),
    industries: unique(parsed.industries.map(titleCase)),
    tools: unique(parsed.tools.map(titleCase)),
    education: unique(parsed.education.map(titleCase)),
    domains: unique(parsed.domains.map(titleCase)),
    yearsExperience: parsed.yearsExperience ?? heuristic.yearsExperience,
    seniorityEstimate:
      (parsed.seniorityEstimate as Seniority | null) ??
      heuristic.seniorityEstimate,
    parseConfidence: parsed.parseConfidence ?? heuristic.parseConfidence,
  };
}
