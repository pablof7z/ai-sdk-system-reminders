import type { LanguageModelV3Message } from "@ai-sdk/provider";
import type { SystemReminderDescriptor } from "./types.js";
import { combineSystemReminders } from "./utils.js";

function clonePrompt(prompt: LanguageModelV3Message[]): LanguageModelV3Message[] {
  return prompt.map((message) => {
    if (message.role === "system") {
      return { ...message };
    }

    if (message.role === "user") {
      return {
        ...message,
        content: message.content.map((part) => ({ ...part })) as typeof message.content,
      };
    }

    if (message.role === "assistant") {
      return {
        ...message,
        content: message.content.map((part) => ({ ...part })) as typeof message.content,
      };
    }

    return {
      ...message,
      content: message.content.map((part) => ({ ...part })) as typeof message.content,
    };
  });
}

export function applySystemRemindersToPrompt(
  prompt: LanguageModelV3Message[],
  reminders: SystemReminderDescriptor[]
): LanguageModelV3Message[] {
  const combinedReminder = combineSystemReminders(reminders);

  if (combinedReminder === "") {
    return prompt;
  }

  const clonedPrompt = clonePrompt(prompt);

  for (let i = clonedPrompt.length - 1; i >= 0; i--) {
    const message = clonedPrompt[i];
    if (message.role !== "user") {
      continue;
    }

    let lastTextIndex = -1;
    for (let j = message.content.length - 1; j >= 0; j--) {
      if (message.content[j].type === "text") {
        lastTextIndex = j;
        break;
      }
    }

    if (lastTextIndex >= 0) {
      const part = message.content[lastTextIndex];
      if (part.type !== "text") {
        continue;
      }

      message.content[lastTextIndex] = {
        ...part,
        text: `${part.text}\n\n${combinedReminder}`,
      };
      return clonedPrompt;
    }

    message.content.push({
      type: "text",
      text: combinedReminder,
    });
    return clonedPrompt;
  }

  clonedPrompt.push({
    role: "user",
    content: [{ type: "text", text: combinedReminder }],
  });

  return clonedPrompt;
}
