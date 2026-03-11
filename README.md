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

## What You Can Do With It

- recompute reminders like `todo-list`, `response-routing`, or `delegations` every time you build a request
- queue one-shot reminders like `heuristic` or `supervision-message` without mutating stored conversation history
- target queued reminders by scope, such as agent, conversation, workspace, or tenant
- inject reminder snapshots at the last moment through AI SDK middleware
- parse, combine, and re-emit `<system-reminder>` blocks when reminders also flow through tool results or other text channels

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

## Learn By Example

The top-level README stays intentionally high level. The practical guide lives in [`examples/README.md`](./examples/README.md).

Recommended reading order:
1. `examples/01-computed-reminders.ts`
2. `examples/02-current-cycle-reminders.ts`
3. `examples/03-next-cycle-reminders.ts`
4. `examples/04-middleware-injection.ts`
5. `examples/05-xml-utilities.ts`

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

## Run The Examples

From the package root:

```bash
bun run example:01
bun run example:02
bun run example:03
bun run example:04
bun run example:05
```

## Relationship To `AGENTS.md`

`AGENTS.md` is not built into this package.

If your app wants filesystem-driven reminders, a separate producer can emit reminder blocks such as `<system-reminder type="agents-md">...</system-reminder>`. In TENEX, that producer lives in `ai-sdk-fs-tools`.

## License

MIT
