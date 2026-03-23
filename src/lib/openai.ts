import OpenAI from "openai";
import { z } from "zod";

import { env, flags } from "@/lib/env";
import { safeJsonParse } from "@/lib/utils";

let client: OpenAI | null = null;

function getClient() {
  if (!flags.hasOpenAI) {
    return null;
  }

  if (!client) {
    client = new OpenAI({ apiKey: env.openAiApiKey });
  }

  return client;
}

type StructuredGenerationOptions<TSchema extends z.ZodTypeAny> = {
  name: string;
  system: string;
  user: string;
  schema: TSchema;
};

export async function generateStructuredObject<TSchema extends z.ZodTypeAny>({
  name,
  system,
  user,
  schema,
}: StructuredGenerationOptions<TSchema>): Promise<z.infer<TSchema> | null> {
  const openai = getClient();

  if (!openai) {
    return null;
  }

  const response = await openai.responses.create({
    model: env.openAiModel,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${system}\nReturn valid JSON only for schema "${name}".`,
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: user }],
      },
    ],
  });

  const parsed = safeJsonParse<unknown>(response.output_text ?? "");

  if (!parsed) {
    return null;
  }

  const result = schema.safeParse(parsed);
  return result.success ? result.data : null;
}
