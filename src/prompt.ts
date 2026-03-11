import type { LanguageModelV3Message } from "@ai-sdk/provider";
import type { SystemReminderDescriptor } from "./types.js";
import { combineSystemReminders } from "./xml.js";

function clonePrompt(prompt: LanguageModelV3Message[]): LanguageModelV3Message[] {
  return prompt.map((message): LanguageModelV3Message => {
    if (message.role === "system") {
      return { ...message };
    }

    if (message.role === "user") {
      return {
        ...message,
        content: message.content.map((part) => ({ ...part })),
      };
    }

    if (message.role === "assistant") {
      return {
        ...message,
        content: message.content.map((part) => ({ ...part })),
      };
    }

    // tool
    return {
      ...message,
      content: message.content.map((part) => ({ ...part })),
    };
  });
}

export function applySystemReminders(
  prompt: LanguageModelV3Message[],
  reminders: SystemReminderDescriptor[]
): LanguageModelV3Message[] {
  const combinedReminder = combineSystemReminders(reminders);

  if (combinedReminder === "") {
    return prompt;
  }

  if (prompt.length === 0) {
    return [
      {
        role: "user",
        content: [{ type: "text", text: combinedReminder }],
      },
    ];
  }

  const cloned = clonePrompt(prompt);
  const lastMessage = cloned[cloned.length - 1];

  // Tool and system messages can't hold text parts — append a user message instead
  if (lastMessage.role === "system" || lastMessage.role === "tool") {
    cloned.push({
      role: "user",
      content: [{ type: "text", text: combinedReminder }],
    });
    return cloned;
  }

  // Find last text part in the message's content
  for (let j = lastMessage.content.length - 1; j >= 0; j--) {
    const part = lastMessage.content[j];
    if (part.type === "text") {
      (lastMessage.content as unknown as Array<{ type: string; text: string }>)[j] = {
        ...(part as { type: "text"; text: string }),
        text: `${(part as { text: string }).text}\n\n${combinedReminder}`,
      };
      return cloned;
    }
  }

  // No text part found — append one
  (lastMessage.content as unknown as Array<{ type: string; text: string }>).push({
    type: "text",
    text: combinedReminder,
  });

  return cloned;
}
