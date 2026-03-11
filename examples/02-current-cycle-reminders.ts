import { createSystemReminderRuntime } from "../src/index.ts";
import { printJson, printTitle } from "./helpers.ts";

interface Scope {
  agentId: string;
  conversationId: string;
}

async function main() {
  printTitle("Example 02: Current-cycle queued reminders");

  const runtime = createSystemReminderRuntime<Scope, {}>();

  runtime.queue({
    type: "heuristic",
    content: "You have used several tools without updating the todo list.",
    scope: {
      agentId: "agent-1",
      conversationId: "conversation-42",
    },
    cycleId: "run-7",
    delivery: "current-cycle",
  });

  const firstCollect = await runtime.collect({
    scope: {
      agentId: "agent-1",
      conversationId: "conversation-42",
    },
    context: {},
    cycleId: "run-7",
  });

  const secondCollect = await runtime.collect({
    scope: {
      agentId: "agent-1",
      conversationId: "conversation-42",
    },
    context: {},
    cycleId: "run-7",
  });

  const otherScopeCollect = await runtime.collect({
    scope: {
      agentId: "agent-2",
      conversationId: "conversation-42",
    },
    context: {},
    cycleId: "run-7",
  });

  printJson("first collect (delivered)", firstCollect);
  printJson("second collect (consumed)", secondCollect);
  printJson("other scope collect", otherScopeCollect);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
