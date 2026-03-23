import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNowStrict } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function splitCsv(input: string | null | undefined) {
  return (input ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function normalizeText(input: string | null | undefined) {
  return (input ?? "").trim().toLowerCase();
}

export function titleCase(input: string) {
  return input
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatRelativeDate(input?: Date | null) {
  if (!input) {
    return "Unknown";
  }

  return formatDistanceToNowStrict(input, { addSuffix: true });
}

export function formatMoney(value?: number | null) {
  if (value == null) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function safeJsonParse<T>(input: string) {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

export function unique<T>(values: T[]) {
  return [...new Set(values)];
}
