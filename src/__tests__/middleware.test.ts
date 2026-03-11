import { describe, expect, it } from "bun:test";
import type {
  LanguageModelV3CallOptions,
  LanguageModelV3Message,
} from "@ai-sdk/provider";
import { createSystemReminderContext } from "../context.js";
import { createSystemRemindersMiddleware } from "../middleware.js";
import { hasSystemReminder } from "../xml.js";

function makeParams(
  prompt: LanguageModelV3Message[]
): LanguageModelV3CallOptions {
  return {
    prompt,
    mode: { type: "regular" },
    inputFormat: "messages",
  } as LanguageModelV3CallOptions;
}

function getTextFromMessage(message: LanguageModelV3Message): string {
  if (message.role === "system") return message.content;
  for (const part of message.content) {
    if (part.type === "text") return part.text;
  }
  return "";
}

describe("createSystemRemindersMiddleware", () => {
  it("passes params through unchanged when context is empty", async () => {
    const ctx = createSystemReminderContext();
    const middleware = createSystemRemindersMiddleware(ctx);

    const params = makeParams([
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ]);

    const result = await middleware.transformParams!({
      params,
      type: "generate",
    });
    expect(result).toBe(params); // same reference, no copy
  });

  it("injects provider reminder into last user message", async () => {
    const ctx = createSystemReminderContext();
    ctx.registerProvider("rules", () => ({ type: "rules", content: "be concise" }));
    const middleware = createSystemRemindersMiddleware(ctx);

    const params = makeParams([
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ]);

    const result = await middleware.transformParams!({
      params,
      type: "generate",
    });
    const lastMsg = result.prompt[result.prompt.length - 1];
    const text = getTextFromMessage(lastMsg);
    expect(text).toContain("hello");
    expect(hasSystemReminder(text)).toBe(true);
    expect(text).toContain("be concise");
  });

  it("appends user message when last message is a tool message", async () => {
    const ctx = createSystemReminderContext();
    ctx.registerProvider("rules", () => ({ type: "rules", content: "be concise" }));
    const middleware = createSystemRemindersMiddleware(ctx);

    const params = makeParams([
      { role: "user", content: [{ type: "text", text: "hello" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "I'll help" }],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call_1",
            toolName: "search",
            output: { type: "text", value: "search results here" },
          },
        ],
      },
    ]);

    const result = await middleware.transformParams!({
      params,
      type: "generate",
    });
    // Tool messages can't hold text parts — a new user message is appended
    const lastMsg = result.prompt[result.prompt.length - 1];
    expect(lastMsg.role).toBe("user");
    const text = getTextFromMessage(lastMsg);
    expect(hasSystemReminder(text)).toBe(true);
  });

  it("drains queued reminders — second call doesn't include them", async () => {
    const ctx = createSystemReminderContext();
    ctx.queue({ type: "nudge", content: "check todos" });
    const middleware = createSystemRemindersMiddleware(ctx);

    const params = makeParams([
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ]);

    const result1 = await middleware.transformParams!({
      params,
      type: "generate",
    });
    const text1 = getTextFromMessage(
      result1.prompt[result1.prompt.length - 1]
    );
    expect(text1).toContain("check todos");

    const result2 = await middleware.transformParams!({
      params,
      type: "generate",
    });
    expect(result2).toBe(params); // empty context, same ref
  });

  it("supports multimodal user messages (text + file parts)", async () => {
    const ctx = createSystemReminderContext();
    ctx.registerProvider("rules", () => ({ type: "rules", content: "be concise" }));
    const middleware = createSystemRemindersMiddleware(ctx);

    const params = makeParams([
      {
        role: "user",
        content: [
          {
            type: "file",
            data: new Uint8Array([1, 2, 3]),
            filename: "test.png",
            mediaType: "image/png",
          },
          { type: "text", text: "describe this" },
        ],
      },
    ]);

    const result = await middleware.transformParams!({
      params,
      type: "generate",
    });
    const lastMsg = result.prompt[result.prompt.length - 1];
    expect(lastMsg.role).toBe("user");
    const text = getTextFromMessage(lastMsg);
    // Should not find text in file part, but in the text part
    expect(text).toContain("describe this");
    expect(hasSystemReminder(text)).toBe(true);
  });

  it("adds fallback user message when prompt is empty", async () => {
    const ctx = createSystemReminderContext();
    ctx.registerProvider("rules", () => ({ type: "rules", content: "be concise" }));
    const middleware = createSystemRemindersMiddleware(ctx);

    const params = makeParams([]);

    const result = await middleware.transformParams!({
      params,
      type: "generate",
    });
    expect(result.prompt.length).toBe(1);
    expect(result.prompt[0].role).toBe("user");
    const text = getTextFromMessage(result.prompt[0]);
    expect(hasSystemReminder(text)).toBe(true);
  });
});
