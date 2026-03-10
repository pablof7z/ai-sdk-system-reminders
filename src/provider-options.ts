import type { JSONObject } from "@ai-sdk/provider";
import {
  DEFAULT_SYSTEM_REMINDERS_PROVIDER_KEY,
  type CreateSystemRemindersProviderOptionsInput,
  type SystemRemindersRequest,
  type SystemRemindersProviderOptions,
} from "./types.js";

export function createSystemRemindersProviderOptions(
  input: CreateSystemRemindersProviderOptionsInput
): SystemRemindersProviderOptions {
  const providerOptionKey =
    input.providerOptionKey ?? DEFAULT_SYSTEM_REMINDERS_PROVIDER_KEY;

  if (input.tags.length === 0) {
    return {};
  }

  const request: JSONObject = {
    tags: input.tags,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };

  return {
    [providerOptionKey]: request,
  };
}

export function getSystemRemindersRequest(
  providerOptions: SystemRemindersProviderOptions | undefined,
  providerOptionKey: string
): SystemRemindersRequest | undefined {
  const candidate = providerOptions?.[providerOptionKey];

  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  if (tags.length === 0) {
    return undefined;
  }

  const metadata =
    "metadata" in candidate && candidate.metadata && typeof candidate.metadata === "object"
      ? (candidate.metadata as JSONObject)
      : undefined;

  return { tags, metadata };
}

export function stripSystemRemindersProviderOptions(
  providerOptions: SystemRemindersProviderOptions | undefined,
  providerOptionKey: string
): SystemRemindersProviderOptions | undefined {
  if (!providerOptions || !(providerOptionKey in providerOptions)) {
    return providerOptions;
  }

  const nextProviderOptions = Object.fromEntries(
    Object.entries(providerOptions).filter(([key]) => key !== providerOptionKey)
  ) as SystemRemindersProviderOptions;

  return Object.keys(nextProviderOptions).length > 0 ? nextProviderOptions : undefined;
}
