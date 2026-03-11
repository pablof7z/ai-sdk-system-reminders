import type { LanguageModelV3Middleware } from "@ai-sdk/provider";
import type { SystemReminderContext } from "./types.js";
import { applySystemReminders } from "./prompt.js";

export function createSystemRemindersMiddleware(
  ctx: SystemReminderContext
): LanguageModelV3Middleware {
  return {
    specificationVersion: "v3",
    async transformParams({ params }) {
      const reminders = await ctx.collect();
      if (reminders.length === 0) return params;
      return {
        ...params,
        prompt: applySystemReminders(params.prompt, reminders),
      };
    },
  };
}
