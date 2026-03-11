import { describe, expect, test } from "bun:test";
import { createSystemReminderRuntime } from "../index.js";

interface Scope {
  agentId: string;
  conversationId: string;
}

interface Context {
  showTodo: boolean;
}

describe("createSystemReminderRuntime", () => {
  test("registers producers, collects in registration order, and rejects duplicates", async () => {
    const runtime = createSystemReminderRuntime<Scope, Context>();

    runtime.register({
      id: "todo-list",
      resolve: ({ context }) =>
        context.showTodo
          ? { type: "todo-list", content: "Current todo state" }
          : null,
    });
    runtime.register({
      id: "delegations",
      resolve: () => ({ type: "delegations", content: "Active delegations" }),
    });

    expect(() =>
      runtime.register({
        id: "todo-list",
        resolve: () => ({ type: "todo-list", content: "Duplicate" }),
      })
    ).toThrow(/already registered/);

    await expect(
      runtime.collect({
        scope: { agentId: "a", conversationId: "c" },
        context: { showTodo: true },
        cycleId: "cycle-1",
      })
    ).resolves.toEqual([
      { type: "todo-list", content: "Current todo state" },
      { type: "delegations", content: "Active delegations" },
    ]);
  });

  test("queues reminders in fifo order after computed reminders", async () => {
    const runtime = createSystemReminderRuntime<Scope, Context>();
    runtime.register({
      id: "routing",
      resolve: () => ({ type: "response-routing", content: "Respond to @user." }),
    });

    runtime.queue({
      type: "heuristic",
      content: "Update todos before more tool use.",
      scope: { agentId: "a", conversationId: "c" },
      cycleId: "cycle-1",
      delivery: "current-cycle",
    });
    runtime.queue({
      type: "supervision-correction",
      content: "Fix the blocked tool call.",
      scope: { agentId: "a", conversationId: "c" },
      cycleId: "cycle-1",
      delivery: "current-cycle",
    });

    await expect(
      runtime.collect({
        scope: { agentId: "a", conversationId: "c" },
        context: { showTodo: false },
        cycleId: "cycle-1",
      })
    ).resolves.toEqual([
      { type: "response-routing", content: "Respond to @user." },
      { type: "heuristic", content: "Update todos before more tool use." },
      { type: "supervision-correction", content: "Fix the blocked tool call." },
    ]);
  });

  test("delivers current-cycle reminders once and consumes them", async () => {
    const runtime = createSystemReminderRuntime<Scope, Context>();

    runtime.queue({
      type: "heuristic",
      content: "Only once",
      scope: { agentId: "a", conversationId: "c" },
      cycleId: "cycle-1",
      delivery: "current-cycle",
    });

    const first = await runtime.collect({
      scope: { agentId: "a", conversationId: "c" },
      context: { showTodo: false },
      cycleId: "cycle-1",
    });
    const second = await runtime.collect({
      scope: { agentId: "a", conversationId: "c" },
      context: { showTodo: false },
      cycleId: "cycle-1",
    });

    expect(first).toEqual([{ type: "heuristic", content: "Only once" }]);
    expect(second).toEqual([]);
  });

  test("delivers next-cycle reminders only after the cycle changes", async () => {
    const runtime = createSystemReminderRuntime<Scope, Context>();

    runtime.queue({
      type: "supervision-message",
      content: "Show me next cycle",
      scope: { agentId: "a", conversationId: "c" },
      cycleId: "cycle-1",
      delivery: "next-cycle",
    });

    const sameCycle = await runtime.collect({
      scope: { agentId: "a", conversationId: "c" },
      context: { showTodo: false },
      cycleId: "cycle-1",
    });
    const nextCycle = await runtime.collect({
      scope: { agentId: "a", conversationId: "c" },
      context: { showTodo: false },
      cycleId: "cycle-2",
    });

    expect(sameCycle).toEqual([]);
    expect(nextCycle).toEqual([
      { type: "supervision-message", content: "Show me next cycle" },
    ]);
  });

  test("matches queued reminders by shallow scope and supports dismiss/clear", async () => {
    const runtime = createSystemReminderRuntime<Scope, Context>();

    const dismissId = runtime.queue({
      type: "heuristic",
      content: "Dismiss me",
      scope: { agentId: "a" },
      cycleId: "cycle-1",
      delivery: "current-cycle",
    });
    runtime.queue({
      type: "heuristic",
      content: "Keep me out",
      scope: { agentId: "b" },
      cycleId: "cycle-1",
      delivery: "current-cycle",
    });
    runtime.queue({
      type: "supervision-message",
      content: "Clear me",
      scope: { agentId: "a", conversationId: "c" },
      cycleId: "cycle-1",
      delivery: "next-cycle",
    });

    expect(runtime.dismiss(dismissId)).toBe(true);
    expect(
      runtime.clearQueued({
        scope: { agentId: "a", conversationId: "c" },
        type: "supervision-message",
      })
    ).toBe(1);

    await expect(
      runtime.collect({
        scope: { agentId: "a", conversationId: "c" },
        context: { showTodo: false },
        cycleId: "cycle-1",
      })
    ).resolves.toEqual([]);
  });
});
