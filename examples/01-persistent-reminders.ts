/**
 * Example 01: Provider-Based Reminders
 *
 * Demonstrates registerProvider + setProviderData on the SystemReminderContext.
 * Providers run on every collect(), computing reminders from the current data.
 */

import { generateText } from "ai";
import { z } from "zod";
import { createSystemReminderContext } from "../src/index.ts";
import {
  createOllamaModel,
  printTitle,
  printReminderSnapshot,
  createStepCallbacks,
} from "./helpers.ts";

interface AppData {
  responseFormat: string;
  projectRules?: string;
}

const ctx = createSystemReminderContext<AppData>();

// Register providers — they compute reminders from data
ctx.registerProvider("response-routing", (data) =>
  data ? { type: "response-routing", content: data.responseFormat } : null
);

ctx.registerProvider("project-rules", (data) =>
  data?.projectRules ? { type: "project-rules", content: data.projectRules } : null
);

// Set initial data — both providers will produce reminders
ctx.setProviderData({
  responseFormat: "Always respond in JSON format with a 'result' key.",
  projectRules: "Follow clean architecture principles. No TODOs.",
});

printTitle("01 — Provider-Based Reminders");

const { model } = await createOllamaModel(ctx);

printReminderSnapshot("Before first call", await ctx.collect());

// Re-set data since collect() doesn't affect providers, but let's be explicit
ctx.setProviderData({
  responseFormat: "Always respond in JSON format with a 'result' key.",
  projectRules: "Follow clean architecture principles. No TODOs.",
});

console.log("--- First call (both reminders present) ---\n");

await generateText({
  model,
  tools: {
    get_time: {
      description: "Returns the current time",
      inputSchema: z.object({}),
      execute: async () => new Date().toISOString(),
    },
  },
  prompt: "What time is it? Use the get_time tool.",
  maxSteps: 3,
  ...createStepCallbacks(),
});

// Remove project-rules by updating data without it
ctx.setProviderData({
  responseFormat: "Always respond in JSON format with a 'result' key.",
});

printReminderSnapshot("After removing project-rules", await ctx.collect());

// Re-set data since we just collected
ctx.setProviderData({
  responseFormat: "Always respond in JSON format with a 'result' key.",
});

console.log("--- Second call (only response-routing remains) ---\n");

await generateText({
  model,
  prompt: "Say hello.",
  maxSteps: 1,
  ...createStepCallbacks(),
});
