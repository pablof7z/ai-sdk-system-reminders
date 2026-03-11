# Examples

Runnable examples for `ai-sdk-system-reminders`.

The package README is the overview. This directory is the practical guide.

## Setup

From the package root:

```bash
bun install
```

These examples do not require model providers or API keys. They use the runtime, middleware, and helper APIs directly.

## Suggested Reading Order

1. `01-computed-reminders.ts`
2. `02-current-cycle-reminders.ts`
3. `03-next-cycle-reminders.ts`
4. `04-middleware-injection.ts`
5. `05-xml-utilities.ts`

## Example Guide

### 01-computed-reminders.ts
- Registers computed reminder producers.
- Shows how semantic reminder types like `todo-list`, `response-routing`, and `delegations` are collected.
- Shows the request snapshot passed through `providerOptions`.

### 02-current-cycle-reminders.ts
- Queues a one-shot `current-cycle` reminder.
- Shows delivery-once semantics and consumption on repeated collects.
- Shows scope-based targeting.

### 03-next-cycle-reminders.ts
- Queues a one-shot `next-cycle` reminder.
- Shows that it is skipped in the enqueue cycle and delivered after the cycle changes.
- Shows that it is consumed after delivery.

### 04-middleware-injection.ts
- Shows `createSystemRemindersMiddleware(...)` on a realistic prompt.
- Demonstrates latest-user-message injection for a multimodal prompt.
- Shows provider-option stripping after prompt rewrite.

### 05-xml-utilities.ts
- Shows `wrapInSystemReminder(...)`, `combineSystemReminders(...)`, and `appendSystemReminderToMessage(...)`.
- Shows typed parsing and legacy bare-tag parsing.
- Shows `applySystemRemindersToPrompt(...)`.

## API Coverage Map

| API | Where to look |
| --- | --- |
| `createSystemReminderRuntime(...)` | `01`, `02`, `03` |
| `register(...)` | `01` |
| `queue(...)` | `02`, `03` |
| `collect(...)` | `01`, `02`, `03` |
| `createSystemRemindersProviderOptions(...)` | `01`, `04` |
| `createSystemRemindersMiddleware(...)` | `04` |
| `applySystemRemindersToPrompt(...)` | `05` |
| `wrapInSystemReminder(...)` | `05` |
| `combineSystemReminders(...)` | `05` |
| `appendSystemReminderToMessage(...)` | `05` |
| `extractSystemReminder(...)` | `05` |
| `extractAllSystemReminders(...)` | `05` |

## Run Everything

From the package root:

```bash
bun run example:01
bun run example:02
bun run example:03
bun run example:04
bun run example:05
```

Or:

```bash
bun run example:all
```
