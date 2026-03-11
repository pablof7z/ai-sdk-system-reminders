import type { SystemReminderDescriptor } from "./types.js";

const SYSTEM_REMINDER_REGEX = /<system-reminder(?:\s+([^>]*))?>\n?([\s\S]*?)\n?<\/system-reminder>/g;
const FIRST_SYSTEM_REMINDER_REGEX = /<system-reminder(?:\s+([^>]*))?>\n?([\s\S]*?)\n?<\/system-reminder>/;
const ATTRIBUTE_REGEX = /([A-Za-z_][\w:.-]*)=(?:"([^"]*)"|'([^']*)')/g;

interface SystemReminderSegment {
  type?: string;
  content: string;
  attributes?: Record<string, string>;
}

function escapeAttributeValue(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function unescapeAttributeValue(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function parseAttributes(attributesText: string | undefined): Record<string, string> | undefined {
  if (!attributesText) {
    return undefined;
  }

  const attributes: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTRIBUTE_REGEX.lastIndex = 0;

  while ((match = ATTRIBUTE_REGEX.exec(attributesText)) !== null) {
    const [, key, doubleQuoted, singleQuoted] = match;
    const value = doubleQuoted ?? singleQuoted ?? "";
    attributes[key] = unescapeAttributeValue(value);
  }

  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function formatAttributes(attributes: Record<string, string> | undefined): string {
  if (!attributes) {
    return "";
  }

  const entries = Object.entries(attributes).filter(
    ([key, value]) => key.trim() !== "" && value.trim() !== ""
  );

  if (entries.length === 0) {
    return "";
  }

  return ` ${entries
    .map(([key, value]) => `${key}="${escapeAttributeValue(value)}"`)
    .join(" ")}`;
}

function normalizeDescriptor(
  reminder: SystemReminderDescriptor
): SystemReminderDescriptor | null {
  const type = reminder.type.trim();
  const content = reminder.content.trim();

  if (!type || !content) {
    return null;
  }

  const attributes = reminder.attributes
    ? Object.fromEntries(
        Object.entries(reminder.attributes).filter(
          ([key, value]) => key.trim() !== "" && value.trim() !== ""
        )
      )
    : undefined;

  return {
    type,
    content,
    ...(attributes && Object.keys(attributes).length > 0 ? { attributes } : {}),
  };
}

function splitSystemReminderSegments(content: string): SystemReminderSegment[] {
  const results: SystemReminderSegment[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  SYSTEM_REMINDER_REGEX.lastIndex = 0;

  while ((match = SYSTEM_REMINDER_REGEX.exec(content)) !== null) {
    const beforeText = content.substring(lastIndex, match.index).trim();
    if (beforeText) {
      results.push({ content: beforeText });
    }

    const attributes = parseAttributes(match[1]);
    const body = match[2]?.trim() ?? "";

    if (body) {
      results.push({
        type: attributes?.type,
        content: body,
        attributes,
      });
    }

    lastIndex = SYSTEM_REMINDER_REGEX.lastIndex;
  }

  const afterText = content.substring(lastIndex).trim();
  if (afterText) {
    results.push({ content: afterText });
  }

  return results;
}

export function wrapInSystemReminder(reminder: SystemReminderDescriptor): string {
  const descriptor = normalizeDescriptor(reminder);

  if (!descriptor) {
    return "";
  }

  const attributes = formatAttributes({
    ...(descriptor.attributes ?? {}),
    type: descriptor.type,
  });

  return `<system-reminder${attributes}>\n${descriptor.content}\n</system-reminder>`;
}

export function extractSystemReminder(
  content: string,
  fallbackType?: string
): SystemReminderDescriptor | null {
  const match = content.match(FIRST_SYSTEM_REMINDER_REGEX);
  if (!match) {
    return null;
  }

  const attributes = parseAttributes(match[1]);
  const body = match[2]?.trim() ?? "";
  const resolvedType = attributes?.type ?? fallbackType;

  if (!body || !resolvedType) {
    return null;
  }

  return {
    type: resolvedType,
    content: body,
    ...(attributes ? { attributes } : {}),
  };
}

export function extractAllSystemReminders(
  content: string,
  fallbackType?: string
): SystemReminderDescriptor[] {
  return splitSystemReminderSegments(content)
    .filter(
      (segment): segment is SystemReminderSegment & { type?: string } =>
        segment.content.trim().length > 0
    )
    .flatMap((segment) => {
      const resolvedType = segment.type ?? fallbackType;
      if (!resolvedType) {
        return [];
      }

      return [
        {
          type: resolvedType,
          content: segment.content,
          ...(segment.attributes ? { attributes: segment.attributes } : {}),
        },
      ];
    });
}

export function combineSystemReminders(
  reminders: SystemReminderDescriptor[]
): string {
  const combined = reminders
    .map((reminder) => normalizeDescriptor(reminder))
    .filter((reminder): reminder is SystemReminderDescriptor => reminder !== null)
    .map((reminder) => wrapInSystemReminder(reminder))
    .filter((reminder) => reminder.length > 0)
    .join("\n\n");

  return combined;
}

export function appendSystemReminderToMessage(
  existingContent: string,
  reminder: SystemReminderDescriptor | SystemReminderDescriptor[]
): string {
  const wrappedReminder = combineSystemReminders(
    Array.isArray(reminder) ? reminder : [reminder]
  );

  if (!wrappedReminder) {
    return existingContent;
  }

  return existingContent ? `${existingContent}\n\n${wrappedReminder}` : wrappedReminder;
}

export function hasSystemReminder(content: string): boolean {
  return FIRST_SYSTEM_REMINDER_REGEX.test(content);
}

export function extractSystemReminderContent(content: string): string {
  const match = content.match(FIRST_SYSTEM_REMINDER_REGEX);
  return match ? match[2].trim() : "";
}

export function extractAllSystemReminderContents(content: string): string[] {
  return splitSystemReminderSegments(content)
    .map((segment) => segment.content.trim())
    .filter((segment) => segment.length > 0);
}

export function normalizeSystemReminderContents(
  reminders: SystemReminderDescriptor[]
): SystemReminderDescriptor[] {
  return reminders
    .map((reminder) => normalizeDescriptor(reminder))
    .filter((reminder): reminder is SystemReminderDescriptor => reminder !== null);
}
