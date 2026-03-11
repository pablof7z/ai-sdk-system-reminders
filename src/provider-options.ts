import type { JSONObject } from "@ai-sdk/provider";
import {
  DEFAULT_SYSTEM_REMINDERS_PROVIDER_KEY,
  type CreateSystemRemindersProviderOptionsInput,
  type SystemReminderDescriptor,
  type SystemRemindersRequest,
  type SystemRemindersProviderOptions,
} from "./types.js";

function normalizeReminders(value: unknown): SystemReminderDescriptor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is SystemReminderDescriptor =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as { type?: unknown }).type === "string" &&
        typeof (entry as { content?: unknown }).content === "string"
    )
    .map((entry) => {
      const type = entry.type.trim();
      const content = entry.content.trim();
      const attributes =
        entry.attributes && typeof entry.attributes === "object"
          ? Object.fromEntries(
              Object.entries(entry.attributes).filter(
                ([key, value]) =>
                  key.trim() !== "" &&
                  typeof value === "string" &&
                  value.trim() !== ""
              )
            )
          : undefined;

      return {
        type,
        content,
        ...(attributes && Object.keys(attributes).length > 0 ? { attributes } : {}),
      };
    })
    .filter((entry) => entry.type !== "" && entry.content !== "");
}

export function createSystemRemindersProviderOptions(
  input: CreateSystemRemindersProviderOptionsInput
): SystemRemindersProviderOptions {
  const providerOptionKey =
    input.providerOptionKey ?? DEFAULT_SYSTEM_REMINDERS_PROVIDER_KEY;

  const reminders = normalizeReminders(input.reminders);

  if (reminders.length === 0) {
    return {};
  }

  const request: JSONObject = {
    reminders: reminders.map(
      (reminder) =>
        ({
          type: reminder.type,
          content: reminder.content,
          ...(reminder.attributes ? { attributes: reminder.attributes } : {}),
        }) as JSONObject
    ),
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

  const reminders = normalizeReminders(
    (candidate as { reminders?: unknown }).reminders
  );

  if (reminders.length === 0) {
    return undefined;
  }

  return { reminders };
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
