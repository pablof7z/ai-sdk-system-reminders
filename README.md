# ai-sdk-system-reminders

Add per-request reminders to model calls without rebuilding your whole prompt.

Use this when your app has instructions that are:

- dynamic
- temporary
- derived from runtime state
- better attached at the last moment than baked into your base system prompt

Examples:

- remind the model about the current workspace, branch, or user goal
- inject a warning after a tool failure or risky action
- add AGENTS.md or project-specific guidance only when it matters
- include ephemeral instructions for the next step without mutating conversation history

You define reminder sources once, select them by tag on each request, and the
middleware appends the resolved reminders to the latest user turn before the
provider sees the prompt.

## Why This Exists

Most apps end up with some version of this problem:

- the base system prompt should stay stable
- some instructions only exist at runtime
- those instructions need to be added consistently
- you do not want reminder logic scattered across prompt builders, tool code, and request wrappers

`ai-sdk-system-reminders` centralizes that logic.

It gives you:

- a small registry for named reminder sources
- a request-scoped way to choose which reminders to apply
- pure utilities for wrapping, combining, and extracting reminder blocks
- AI SDK middleware that applies reminders right before the request is sent

## How It Works

1. Register reminder resolvers under stable tags such as `dynamic-context` or
   `tool-warning`.
2. On a request, pass `providerOptions.systemReminders.tags` plus any runtime
   metadata the resolvers need.
3. The middleware resolves those tags, combines the results into a single
   `<system-reminder>` block, and appends it to the latest user message.

Unknown tags are ignored. Empty reminder outputs are skipped.

## Quick Start

```ts
import {
  createSystemReminderRegistry,
  createSystemRemindersMiddleware,
  createSystemRemindersProviderOptions,
} from "ai-sdk-system-reminders";

const registry = createSystemReminderRegistry({
  "dynamic-context": ({ metadata }) =>
    metadata?.dynamicContext as string | undefined,
  "tool-warning": ({ metadata }) => metadata?.toolWarning as string | undefined,
});

const middleware = createSystemRemindersMiddleware({ registry });

const providerOptions = createSystemRemindersProviderOptions({
  tags: ["dynamic-context", "tool-warning"],
  metadata: {
    dynamicContext: "You are operating in /repo/app and the user wants a hotfix.",
    toolWarning: "The previous shell command failed. Re-check assumptions before continuing.",
  },
});
```

## Example Use Cases

- Coding agents that need to inject fresh repository context on every step
- Tool-using assistants that need to add warnings after a failed command
- Multi-tenant apps that attach account, workspace, or policy reminders at runtime
- Systems that keep a durable conversation transcript but still need ephemeral guidance

## Main Exports

- `createSystemReminderRegistry(...)`
- `createSystemRemindersMiddleware(...)`
- `systemReminders(...)`
- `createSystemRemindersProviderOptions(...)`
- `applySystemRemindersToPrompt(...)`
- `wrapInSystemReminder(...)`
- `combineSystemReminders(...)`
- `appendSystemReminderToMessage(...)`
- `hasSystemReminder(...)`
- `extractSystemReminderContent(...)`
- `extractAllSystemReminderContents(...)`

## When To Use It

Use this package if you already have a stable base prompt and need a clean way
to inject runtime instructions into specific requests.

Do not use it if all of your instructions are static and can live directly in
your normal system prompt.

## License

MIT
