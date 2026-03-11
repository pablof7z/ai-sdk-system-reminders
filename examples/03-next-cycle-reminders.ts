import { createSystemReminderRuntime } from "../src/index.ts";
import { printJson, printTitle } from "./helpers.ts";

interface Scope {
  agentId: string;
  conversationId: string;
}

async function main() {
  printTitle("Example 03: Next-cycle queued reminders");

  const runtime = createSystemReminderRuntime<Scope, {}>();

  runtime.queue({
    type: "supervision-message",
    content: "Task Tracking Suggestion: create a todo before continuing.",
    scope: {
      agentId: "agent-1",
      conversationId: "conversation-42",
    },
    cycleId: "run-7",
    delivery: "next-cycle",
  });

  const sameCycle = await runtime.collect({
    scope: {
      agentId: "agent-1",
      conversationId: "conversation-42",
    },
    context: {},
    cycleId: "run-7",
  });

  const nextCycle = await runtime.collect({
    scope: {
      agentId: "agent-1",
      conversationId: "conversation-42",
    },
    context: {},
    cycleId: "run-8",
  });

  const thirdCycle = await runtime.collect({
    scope: {
      agentId: "agent-1",
      conversationId: "conversation-42",
    },
    context: {},
    cycleId: "run-9",
  });

  printJson("same cycle (not delivered yet)", sameCycle);
  printJson("next cycle (delivered once)", nextCycle);
  printJson("third cycle (already consumed)", thirdCycle);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
