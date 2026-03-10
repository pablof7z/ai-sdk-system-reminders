# ai-sdk-system-reminders

Tagged system reminder utilities and AI SDK middleware for appending dynamic
`<system-reminder>` blocks to the latest user message at request time.

## Overview

This package gives you two layers:

- pure reminder helpers for wrapping, combining, extracting, and appending
- an AI SDK v3 middleware that resolves reminder tags from provider options and
  rewrites the outgoing prompt

The middleware uses explicit tags from `providerOptions.systemReminders.tags`
and passes `providerOptions.systemReminders.metadata` into reminder resolvers.

## Quick Start

```ts
import {
  createSystemReminderRegistry,
  createSystemRemindersMiddleware,
  createSystemRemindersProviderOptions,
} from "ai-sdk-system-reminders";

const registry = createSystemReminderRegistry({
  "dynamic-context": ({ metadata }) => metadata?.dynamicContext as string | undefined,
  ephemeral: ({ metadata }) => metadata?.ephemeral as string[] | undefined,
});

const middleware = createSystemRemindersMiddleware({ registry });

const providerOptions = createSystemRemindersProviderOptions({
  tags: ["dynamic-context", "ephemeral"],
  metadata: {
    dynamicContext: "Use the todo list before continuing.",
    ephemeral: ["Double-check the last tool result."],
  },
});
```

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

## License

MIT
