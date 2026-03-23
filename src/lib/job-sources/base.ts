import type { JobSource } from "@/lib/types";

export type SourceAdapter = {
  type: JobSource["type"];
};
