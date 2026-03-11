import type { LanguageModelV3Message } from "@ai-sdk/provider";
import {
  createSystemRemindersMiddleware,
  createSystemRemindersProviderOptions,
} from "../src/index.ts";
import { printJson, printText, printTitle } from "./helpers.ts";

async function main() {
  printTitle("Example 04: Middleware prompt injection");

  const middleware = createSystemRemindersMiddleware({});

  const prompt: LanguageModelV3Message[] = [
    {
      role: "system",
      content: "You are a coding agent.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Please inspect the test failure." },
        {
          type: "file",
          data: "https://example.com/screenshot.png",
          mediaType: "image/png",
        },
      ],
    },
  ];

  const providerOptions = createSystemRemindersProviderOptions({
    reminders: [
      {
        type: "todo-list",
        content: "# Current Todos\n- Reproduce the test failure\n- Identify the regression",
      },
      {
        type: "heuristic",
        content: "Update the todo list if you decide to use more tools.",
      },
    ],
  });

  const result = await middleware.transformParams?.({
    params: {
      prompt,
      providerOptions: {
        ...providerOptions,
        openrouter: { usage: { include: true } },
      },
    } as never,
    type: "generate-text" as never,
    model: {
      provider: "example",
      modelId: "demo-model",
    } as never,
  });

  const finalUserText =
    result?.prompt[1]?.role === "user" && result.prompt[1].content[0]?.type === "text"
      ? result.prompt[1].content[0].text
      : "";

  printText("final user text", finalUserText);
  printJson("remaining providerOptions", result?.providerOptions);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
