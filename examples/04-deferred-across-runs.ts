/**
 * Example 04: Deferred Reminders Across Runs
 *
 * Demonstrates defer() and advance() for cross-run reminder delivery.
 * A delegation result is deferred during one run and delivered in the next
 * after advance() promotes it into the queue.
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
  activeDelegations: string;
}

const ctx = createSystemReminderContext<AppData>();

// Register a provider for active delegations
ctx.registerProvider("delegations", (data) =>
  data ? { type: "delegations", content: data.activeDelegations } : null
);

const { model } = await createOllamaModel(ctx);

printTitle("04 — Deferred Across Runs");

// Set initial state — one active delegation
ctx.setProviderData({
  activeDelegations: "Active delegations:\n- task-42: Research competitor pricing (assigned to analyst-agent)",
});

// Simulate a delegation completing (e.g. from an external event)
// This defers the result so it won't appear until advance() is called
ctx.defer({
  type: "delegation-result",
  content: [
    "Delegation task-42 completed:",
    "Analyst found 3 competitors with pricing between $10-$50/mo.",
    "Full report available in /reports/competitor-pricing.md",
  ].join("\n"),
});

// First run: agent sees delegations but NOT the deferred result
console.log("--- Run 1: Sees delegations, deferred result not yet visible ---\n");

await generateText({
  model,
  prompt: "Check on the status of active delegations and summarize what's pending.",
  maxSteps: 2,
  ...createStepCallbacks(),
});

// Between runs: promote deferred into queue and update delegation state
ctx.advance();
ctx.setProviderData({
  activeDelegations: "Active delegations:\n- (none — all tasks completed)",
});

printReminderSnapshot("After advance() — what next collect() will return", await ctx.collect());

// Re-set data and re-defer since we just collected for the snapshot
ctx.setProviderData({
  activeDelegations: "Active delegations:\n- (none — all tasks completed)",
});
ctx.defer({
  type: "delegation-result",
  content: [
    "Delegation task-42 completed:",
    "Analyst found 3 competitors with pricing between $10-$50/mo.",
    "Full report available in /reports/competitor-pricing.md",
  ].join("\n"),
});
ctx.advance();

console.log("--- Run 2: Delegation result now visible as one-shot ---\n");

await generateText({
  model,
  prompt:
    "Any delegation results available? If so, summarize the findings.",
  maxSteps: 2,
  ...createStepCallbacks(),
});
