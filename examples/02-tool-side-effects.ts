/**
 * Example 02: Tool Side Effects
 *
 * Tools mutate the SystemReminderContext during execution.
 * The todo_write tool updates provider data so subsequent
 * model steps see the current todo state via the provider.
 */

import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { createSystemReminderContext } from "../src/index.ts";
import {
  createOllamaModel,
  printTitle,
  createStepCallbacks,
} from "./helpers.ts";

interface AppData {
  todos: Array<{ id: number; text: string; done: boolean }>;
}

const ctx = createSystemReminderContext<AppData>();

// Register a provider that renders the todo list
ctx.registerProvider("todo-list", (data) => {
  if (!data?.todos.length) return null;
  const todoText = data.todos
    .map((t) => `- [${t.done ? "x" : " "}] #${t.id}: ${t.text}`)
    .join("\n");
  return { type: "todo-list", content: `Current todos:\n${todoText}` };
});

const { model } = await createOllamaModel(ctx);

printTitle("02 — Tool Side Effects");

// In-memory todo store
const todos: AppData["todos"] = [];
let nextId = 1;

// Initialize with empty data
ctx.setProviderData({ todos });

await generateText({
  model,
  tools: {
    todo_write: {
      description:
        "Create or update a todo item. Returns the current todo list.",
      inputSchema: z.object({
        text: z.string().describe("The todo item text"),
        done: z.boolean().optional().describe("Whether the item is done"),
      }),
      execute: async ({ text, done }) => {
        todos.push({ id: nextId++, text, done: done ?? false });

        // Update the provider data — next collect() will see the new todos
        ctx.setProviderData({ todos });

        return { todos };
      },
    },
    todo_list: {
      description: "List all current todo items",
      inputSchema: z.object({}),
      execute: async () => ({ todos }),
    },
  },
  prompt: [
    "Create three todo items about setting up a new project:",
    "1. Initialize git repository",
    "2. Set up TypeScript config",
    "3. Add linting",
    "After creating all three, list the todos to confirm.",
  ].join("\n"),
  maxSteps: 6,
  stopWhen: stepCountIs(6),
  ...createStepCallbacks(),
});
