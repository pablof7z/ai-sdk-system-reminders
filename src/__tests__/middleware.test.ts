import { describe, expect, test } from "bun:test";
import type { LanguageModelV3Message } from "@ai-sdk/provider";
import {
  createSystemRemindersMiddleware,
  createSystemRemindersProviderOptions,
} from "../index.js";

describe("createSystemRemindersMiddleware", () => {
  test("appends snapshot reminders to the latest user message in order", async () => {
    const middleware = createSystemRemindersMiddleware({});
    const prompt: LanguageModelV3Message[] = [
      { role: "system", content: "SYSTEM" },
      { role: "user", content: [{ type: "text", text: "Hello" }] },
    ];

    const result = await middleware.transformParams?.({
      params: {
        prompt,
        providerOptions: createSystemRemindersProviderOptions({
          reminders: [
            { type: "todo-list", content: "Keep the todo list current." },
            { type: "delegations", content: "Use delegate_followup for active delegations." },
          ],
        }),
      } as any,
      type: "generate-text" as any,
      model: { provider: "test", modelId: "model" } as any,
    });

    const userMessage = result?.prompt[1] as LanguageModelV3Message;
    const textPart = userMessage.content[0];

    expect(textPart.type).toBe("text");
    expect(textPart.text).toContain("Hello");
    expect(textPart.text).toContain('<system-reminder type="todo-list">');
    expect(textPart.text).toContain("Keep the todo list current.");
    expect(textPart.text).toContain('<system-reminder type="delegations">');
    expect(textPart.text).toContain("Use delegate_followup");
    expect(textPart.text.indexOf('type="todo-list"')).toBeLessThan(
      textPart.text.indexOf('type="delegations"')
    );
    expect(result?.providerOptions).toBeUndefined();
  });

  test("supports multimodal user messages", async () => {
    const middleware = createSystemRemindersMiddleware({});
    const prompt: LanguageModelV3Message[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this" },
          { type: "file", data: "https://example.com/cat.png", mediaType: "image/png" },
        ],
      },
    ];

    const result = await middleware.transformParams?.({
      params: {
        prompt,
        providerOptions: createSystemRemindersProviderOptions({
          reminders: [{ type: "image-review", content: "Review the image carefully." }],
        }),
      } as any,
      type: "generate-text" as any,
      model: { provider: "test", modelId: "model" } as any,
    });

    const textPart = (result?.prompt[0] as LanguageModelV3Message).content[0];
    expect(textPart.type).toBe("text");
    expect(textPart.text).toContain("Describe this");
    expect(textPart.text).toContain('<system-reminder type="image-review">');
    expect(textPart.text).toContain("Review the image carefully.");
  });

  test("adds a fallback user message when no user message exists", async () => {
    const middleware = createSystemRemindersMiddleware({});
    const result = await middleware.transformParams?.({
      params: {
        prompt: [{ role: "system", content: "SYSTEM" }],
        providerOptions: createSystemRemindersProviderOptions({
          reminders: [{ type: "fallback", content: "Fallback reminder" }],
        }),
      } as any,
      type: "generate-text" as any,
      model: { provider: "test", modelId: "model" } as any,
    });

    expect(result?.prompt).toHaveLength(2);
    const fallbackUser = result?.prompt[1] as LanguageModelV3Message;
    expect(fallbackUser.role).toBe("user");
    expect(fallbackUser.content[0]).toEqual({
      type: "text",
      text: '<system-reminder type="fallback">\nFallback reminder\n</system-reminder>',
    });
  });

  test("strips only the system reminders provider option namespace", async () => {
    const middleware = createSystemRemindersMiddleware({});
    const result = await middleware.transformParams?.({
      params: {
        prompt: [{ role: "user", content: [{ type: "text", text: "Question" }] }],
        providerOptions: {
          ...createSystemRemindersProviderOptions({
            reminders: [{ type: "legacy", content: "Legacy content" }],
          }),
          openrouter: { usage: { include: true } },
        },
      } as any,
      type: "generate-text" as any,
      model: { provider: "test", modelId: "model" } as any,
    });

    const textPart = (result?.prompt[0] as LanguageModelV3Message).content[0];
    expect(textPart.type).toBe("text");
    expect(textPart.text).toContain('<system-reminder type="legacy">');
    expect(textPart.text).toContain("Legacy content");
    expect(result?.providerOptions).toEqual({
      openrouter: { usage: { include: true } },
    });
  });
});
