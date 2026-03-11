import {
  createSystemReminderRuntime,
  createSystemRemindersProviderOptions,
} from "../src/index.ts";
import { printJson, printTitle } from "./helpers.ts";

interface Scope {
  agentId: string;
  conversationId: string;
}

interface Context {
  currentTodos: string[];
  responseTarget: string;
  activeDelegations: string[];
}

async function main() {
  printTitle("Example 01: Computed reminders");

  const runtime = createSystemReminderRuntime<Scope, Context>();

  runtime.register({
    id: "todo-list",
    resolve: ({ context }) =>
      context.currentTodos.length > 0
        ? {
            type: "todo-list",
            content: [
              "# Current Todos",
              ...context.currentTodos.map((todo) => `- ${todo}`),
            ].join("\n"),
          }
        : null,
  });

  runtime.register({
    id: "response-routing",
    resolve: ({ context }) => ({
      type: "response-routing",
      content: `Your response will be sent to @${context.responseTarget}.`,
    }),
  });

  runtime.register({
    id: "delegations",
    resolve: ({ context }) =>
      context.activeDelegations.length > 0
        ? {
            type: "delegations",
            content: [
              `You have delegations to: ${context.activeDelegations
                .map((agent) => `@${agent}`)
                .join(", ")}.`,
              "Use delegate_followup if you want to continue one of those delegations.",
            ].join("\n"),
          }
        : null,
  });

  const reminders = await runtime.collect({
    scope: {
      agentId: "agent-1",
      conversationId: "conversation-42",
    },
    context: {
      currentTodos: ["Review failing tests", "Confirm the hotfix rollout"],
      responseTarget: "alice",
      activeDelegations: ["qa-bot", "ops-bot"],
    },
    cycleId: "run-1",
  });

  const providerOptions = createSystemRemindersProviderOptions({ reminders });

  printJson("collected reminders", reminders);
  printJson("providerOptions snapshot", providerOptions);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
