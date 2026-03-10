/**
 * Wrap content in `<system-reminder>` tags.
 */
export function wrapInSystemReminder(content: string): string {
  if (!content || content.trim() === "") {
    return "";
  }

  return `<system-reminder>\n${content.trim()}\n</system-reminder>`;
}

/**
 * Combine multiple reminder bodies into one `<system-reminder>` block.
 */
export function combineSystemReminders(contents: string[]): string {
  const nonEmpty = contents
    .map((content) => content.trim())
    .filter((content) => content.length > 0);

  if (nonEmpty.length === 0) {
    return "";
  }

  return wrapInSystemReminder(nonEmpty.join("\n\n"));
}

/**
 * Append a system reminder block to an existing string message.
 */
export function appendSystemReminderToMessage(
  existingContent: string,
  reminderContent: string
): string {
  if (!reminderContent || reminderContent.trim() === "") {
    return existingContent;
  }

  const wrappedReminder = reminderContent.trim().startsWith("<system-reminder>")
    ? reminderContent.trim()
    : wrapInSystemReminder(reminderContent);

  return `${existingContent}\n\n${wrappedReminder}`;
}

/**
 * Check whether content contains a `<system-reminder>` block.
 */
export function hasSystemReminder(content: string): boolean {
  return content.includes("<system-reminder>") && content.includes("</system-reminder>");
}

/**
 * Extract the inner content of the first `<system-reminder>` block.
 */
export function extractSystemReminderContent(content: string): string {
  const match = content.match(/<system-reminder>\n?([\s\S]*?)\n?<\/system-reminder>/);
  return match ? match[1].trim() : "";
}

/**
 * Extract the inner content of all `<system-reminder>` blocks, preserving
 * surrounding text as standalone entries.
 */
export function extractAllSystemReminderContents(content: string): string[] {
  const results: string[] = [];
  const regex = /<system-reminder>\n?([\s\S]*?)\n?<\/system-reminder>/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    const beforeText = content.substring(lastIndex, match.index).trim();
    if (beforeText) {
      results.push(beforeText);
    }

    const innerContent = match[1].trim();
    if (innerContent) {
      results.push(innerContent);
    }

    lastIndex = regex.lastIndex;
  }

  const afterText = content.substring(lastIndex).trim();
  if (afterText) {
    results.push(afterText);
  }

  return results;
}

/**
 * Normalize reminder content before combining it into one block.
 */
export function normalizeSystemReminderContents(contents: string[]): string[] {
  const normalized: string[] = [];

  for (const content of contents) {
    const trimmed = content.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("<system-reminder>")) {
      const extracted = extractAllSystemReminderContents(trimmed);
      if (extracted.length > 0) {
        normalized.push(...extracted);
        continue;
      }
    }

    normalized.push(trimmed);
  }

  return normalized;
}
