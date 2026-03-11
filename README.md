# ai-sdk-system-reminders

Dynamic prompt injection for multi-step AI agents built on the Vercel AI SDK.

## The Problem

Multi-step AI agents need dynamic context injected into their prompts — todo lists that change after tool calls, routing instructions that depend on who's being addressed, delegation status that updates asynchronously. This context must be recomputed between steps, but the AI SDK's middleware layer doesn't know about your application's data model.

Without structure, you end up imperatively pushing prompt fragments from scattered call sites, with no single place to instrument, debug, or reason about what the model sees.

## How It Works

Register **providers** — functions that compute prompt fragments from your application state. The middleware calls them lazily at each model invocation, so you set data once and reminders stay current across steps.

```typescript
import { createSystemReminderContext, createSystemRemindersMiddleware } from "ai-sdk-system-reminders";
import { generateText, wrapLanguageModel } from "ai";

// 1. Create a typed context
const ctx = createSystemReminderContext<{ userName: string; todos: string[] }>();

// 2. Register providers — they run on every model call
ctx.registerProvider("greeting", (data) =>
  data ? { type: "greeting", content: `You are talking to ${data.userName}.` } : null
);

ctx.registerProvider("todos", (data) => {
  if (!data?.todos.length) return null;
  return { type: "todos", content: `Current todos:\n${data.todos.map(t => `- ${t}`).join("\n")}` };
});

// 3. Wire up the middleware
const model = wrapLanguageModel({
  model: yourBaseModel,
  middleware: [createSystemRemindersMiddleware(ctx)],
});

// 4. Push data — providers will pick it up at the next model call
ctx.setProviderData({ userName: "Alice", todos: ["Set up CI", "Write tests"] });

const result = await generateText({ model, prompt: "What should I work on next?" });
```

The middleware collects provider output and injects it as XML-tagged `<system-reminder>` blocks into the last user message. The model sees them as authoritative system instructions embedded in the conversation.

## Three Delivery Modes

| Mode | Method | Lifetime | Use Case |
|------|--------|----------|----------|
| **Provider** | `registerProvider()` | Runs every `collect()` | State that must stay current: todos, routing, delegations |
| **Queue** | `queue()` | Consumed once | One-shot nudges: heuristic violations, tool corrections |
| **Defer** | `defer()` + `advance()` | Held until next cycle | Cross-cycle delivery: delegation results arriving between agent runs |

## API

### `createSystemReminderContext<T>(options?): SystemReminderContext<T>`

Creates a typed context. The generic `T` defines the shape of data passed to providers.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `onCollect` | `(reminders: Descriptor[]) => void` | Called after every `collect()` with the final list. Wire to telemetry. |
| `onProviderError` | `(type: string, error: unknown) => void` | Called when a provider throws. The provider is skipped; others still run. |

**Methods:**

| Method | Description |
|--------|-------------|
| `registerProvider(type, fn)` | Register a provider function. Replaces any existing provider with the same type. |
| `removeProvider(type)` | Remove a provider. Returns `true` if it existed. |
| `setProviderData(data)` | Set the data blob passed to all providers on next `collect()`. |
| `queue(descriptor)` | One-shot reminder. Returned by the next `collect()`, then drained. |
| `defer(descriptor)` | Held back until `advance()` promotes it into the queue. |
| `advance()` | Promote all deferred items into the queue. Call between agent runs/cycles. |
| `collect()` | **Async.** Runs all providers, appends queued items, drains the queue, fires `onCollect`. |
| `clear()` | Resets data + queued + deferred. Providers are **not** removed (they're structural). |

### `createSystemRemindersMiddleware(ctx): LanguageModelV3Middleware`

AI SDK v3 middleware. Calls `await ctx.collect()` in `transformParams` and injects reminders into the prompt.

### XML Utilities

```typescript
wrapInSystemReminder(descriptor)           // → XML string
combineSystemReminders(descriptors[])      // → joined XML string
extractSystemReminder(content, type?)      // → descriptor | null
extractAllSystemReminders(content, type?)  // → descriptor[]
hasSystemReminder(content)                 // → boolean
```

### `applySystemReminders(prompt, reminders): LanguageModelV3Message[]`

Manually apply reminders to a prompt array without using the middleware.

## Examples

Run against a local Ollama instance:

```bash
bun run example:01  # Provider-based reminders
bun run example:02  # Tool side effects with queue()
bun run example:03  # Heuristic nudges via queue()
bun run example:04  # Deferred reminders across agent runs
```

Set `OLLAMA_MODEL` to choose a specific model, or let it auto-detect.

## License

MIT
