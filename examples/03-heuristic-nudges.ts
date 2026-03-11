/**
 * Example 03: Heuristic Nudges (One-Shot Queue)
 *
 * Demonstrates queue() for one-shot heuristic reminders.
 * After 3 consecutive bash tool calls without a todo update,
 * a heuristic nudge is queued and consumed on the next step.
 */

import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { createSystemReminderContext } from "../src/index.ts";
import {
  createOllamaModel,
  printTitle,
  createStepCallbacks,
} from "./helpers.ts";

const ctx = createSystemReminderContext();
const { model } = await createOllamaModel(ctx);

printTitle("03 — Heuristic Nudges");

let consecutiveBashCalls = 0;

await generateText({
  model,
  tools: {
    bash: {
      description: "Run a bash command and return its output",
      inputSchema: z.object({
        command: z.string().describe("The command to execute"),
      }),
      execute: async ({ command }) => {
        consecutiveBashCalls++;

        if (consecutiveBashCalls >= 3) {
          ctx.queue({
            type: "heuristic",
            content:
              "You have run several bash commands without updating your todo list. Consider using todo_write to track your progress.",
          });
          consecutiveBashCalls = 0;
        }

        // Simulate command output
        return { stdout: `[simulated output of: ${command}]`, exitCode: 0 };
      },
    },
    todo_write: {
      description: "Write a todo item to track progress",
      inputSchema: z.object({
        text: z.string(),
      }),
      execute: async ({ text }) => {
        consecutiveBashCalls = 0; // Reset counter
        return { written: text };
      },
    },
  },
  prompt: [
    "You are setting up a project. Run these bash commands in order:",
    "1. ls -la",
    "2. git init",
    "3. npm init -y",
    "4. After those three, write a todo about what you've done.",
    "5. Then run: echo 'done'",
  ].join("\n"),
  maxSteps: 8,
  stopWhen: stepCountIs(8),
  ...createStepCallbacks(),
});
