import { describe, expect, test } from "bun:test";
import type { LanguageModelV3Message } from "@ai-sdk/provider";
import {
  createSystemReminderRegistry,
  createSystemRemindersMiddleware,
  createSystemRemindersProviderOptions,
} from "../index.js";

describe("createSystemRemindersMiddleware", () => {
  test("appends resolved reminders to the latest user message", async () => {
    const registry = createSystemReminderRegistry({
      "dynamic-context": ({ metadata }) => metadata?.dynamicContext as string | undefined,
      ephemeral: ({ metadata }) => metadata?.ephemeral as string[] | undefined,
    });

    const middleware = createSystemRemindersMiddleware({ registry });
    const prompt: LanguageModelV3Message[] = [
      { role: "system", content: "SYSTEM" },
      { role: "user", content: [{ type: "text", text: "Hello" }] },
    ];

    const result = await middleware.transformParams?.({
      params: {
        prompt,
        providerOptions: createSystemRemindersProviderOptions({
          tags: ["dynamic-context", "ephemeral"],
          metadata: {
            dynamicContext: "Dynamic context",
            ephemeral: ["Ephemeral reminder"],
          },
        }),
      } as any,
      type: "generate-text" as any,
      model: { provider: "test", modelId: "model" } as any,
    });

    const userMessage = result?.prompt[1] as LanguageModelV3Message;
    const textPart = userMessage.content[0];
    expect(textPart.type).toBe("text");
    expect(textPart.text).toContain("Hello");
    expect(textPart.text).toContain("<system-reminder>");
    expect(textPart.text).toContain("Dynamic context");
    expect(textPart.text).toContain("Ephemeral reminder");
    expect(result?.providerOptions).toBeUndefined();
  });

  test("supports multimodal user messages", async () => {
    const registry = createSystemReminderRegistry({
      image: "Review the image carefully.",
    });

    const middleware = createSystemRemindersMiddleware({ registry });
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
          tags: ["image"],
        }),
      } as any,
      type: "generate-text" as any,
      model: { provider: "test", modelId: "model" } as any,
    });

    const textPart = (result?.prompt[0] as LanguageModelV3Message).content[0];
    expect(textPart.type).toBe("text");
    expect(textPart.text).toContain("Describe this");
    expect(textPart.text).toContain("Review the image carefully.");
  });

  test("adds a fallback user message when no user message exists", async () => {
    const registry = createSystemReminderRegistry({
      fallback: "Fallback reminder",
    });

    const middleware = createSystemRemindersMiddleware({ registry });
    const result = await middleware.transformParams?.({
      params: {
        prompt: [{ role: "system", content: "SYSTEM" }],
        providerOptions: createSystemRemindersProviderOptions({
          tags: ["fallback"],
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
      text: "<system-reminder>\nFallback reminder\n</system-reminder>",
    });
  });

  test("unwraps already wrapped reminder content and ignores unknown tags", async () => {
    const registry = createSystemReminderRegistry({
      wrapped:
        "<system-reminder>\nWrapped content\n</system-reminder>\nTrailing text",
    });

    const middleware = createSystemRemindersMiddleware({ registry });
    const result = await middleware.transformParams?.({
      params: {
        prompt: [{ role: "user", content: [{ type: "text", text: "Question" }] }],
        providerOptions: {
          ...createSystemRemindersProviderOptions({
            tags: ["wrapped", "unknown"],
          }),
          openrouter: { usage: { include: true } },
        },
      } as any,
      type: "generate-text" as any,
      model: { provider: "test", modelId: "model" } as any,
    });

    const textPart = (result?.prompt[0] as LanguageModelV3Message).content[0];
    expect(textPart.type).toBe("text");
    expect(textPart.text).toContain("Wrapped content");
    expect(textPart.text).toContain("Trailing text");
    expect(textPart.text.match(/<system-reminder>/g)?.length).toBe(1);
    expect(result?.providerOptions).toEqual({
      openrouter: { usage: { include: true } },
    });
  });
});
