# ai-sdk-system-reminders

Stateful system reminders for AI SDK apps.

Use it when your app needs to:

- recompute live reminders like `todo-list` or `delegations` on every request
- queue one-shot reminders for the current cycle or the next cycle
- inject those reminders at request time without mutating stored conversation history

`ai-sdk-system-reminders` has two jobs:

- a runtime that registers reminder producers and queues one-shot reminders
- AI SDK middleware that appends a collected reminder snapshot to the latest user message

## Why It Exists

Most apps eventually need both of these patterns:

- computed reminders from live state
  - example: current todo list, routing target, active delegations
- queued reminders from runtime events
  - example: a heuristic warning after a bad tool sequence, or a correction to show on the next cycle

This package gives you one reminder model for both.

## Core Concepts

- `type`
  - a free-form semantic identifier like `todo-list`, `delegations`, `heuristic`, or `agents-md`
- computed reminder producers
  - registered once and re-evaluated whenever you collect reminders
- queued reminders
  - one-shot reminder instances stored in memory until they are delivered
- reminder snapshots
  - plain `{ type, content, attributes? }` objects passed through `providerOptions`

The middleware only handles the last step: it appends reminder snapshots to the prompt. It does not own reminder state.

## Quick Start

```ts
import {
  createSystemReminderRuntime,
  createSystemRemindersMiddleware,
  createSystemRemindersProviderOptions,
} from "ai-sdk-system-reminders";

const reminders = createSystemReminderRuntime<
  { agentId: string; conversationId: string },
  { currentTodos: string; hasDelegations: boolean }
>();

reminders.register({
  id: "todo-list",
  resolve: ({ context }) =>
    context.currentTodos
      ? { type: "todo-list", content: context.currentTodos }
      : null,
});

reminders.register({
  id: "delegations",
  resolve: ({ context }) =>
    context.hasDelegations
      ? {
          type: "delegations",
          content:
            "You have active delegations. Use delegate_followup instead of replying directly.",
        }
      : null,
});

reminders.queue({
  type: "heuristic",
  content: "You used several tools without updating the todo list.",
  scope: { agentId: "agent-1", conversationId: "conv-1" },
  cycleId: "run-17",
  delivery: "current-cycle",
});

const snapshot = await reminders.collect({
  scope: { agentId: "agent-1", conversationId: "conv-1" },
  context: {
    currentTodos: "## Current Todos\n- [ ] Fix failing test",
    hasDelegations: true,
  },
  cycleId: "run-17",
});

const providerOptions = createSystemRemindersProviderOptions({
  reminders: snapshot,
});

const middleware = createSystemRemindersMiddleware({});
```

## Delivery Modes

- `current-cycle`
  - delivered once when the collected `cycleId` matches the enqueue `cycleId`
- `next-cycle`
  - delivered once after the collected `cycleId` changes

That is useful for patterns like:

- intervene on the current execution after a heuristic violation
- schedule a reminder for the next agent run without persisting it in conversation history

## Main Exports

- `createSystemReminderRuntime(...)`
- `createSystemRemindersMiddleware(...)`
- `systemReminders(...)`
- `createSystemRemindersProviderOptions(...)`
- `applySystemRemindersToPrompt(...)`
- `wrapInSystemReminder(...)`
- `combineSystemReminders(...)`
- `appendSystemReminderToMessage(...)`
- `extractSystemReminder(...)`
- `extractAllSystemReminders(...)`

## Relationship To `AGENTS.md`

`AGENTS.md` is not built into this package.

If your app wants filesystem-driven reminders, a separate producer can emit reminder blocks such as `<system-reminder type="agents-md">...</system-reminder>`. In TENEX, that producer lives in `ai-sdk-fs-tools`.

## License

MIT
