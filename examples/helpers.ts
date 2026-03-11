import { Chalk } from "chalk";
import { wrapLanguageModel } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { createSystemRemindersMiddleware } from "../src/index.ts";
import type {
  SystemReminderContext,
  SystemReminderDescriptor,
} from "../src/index.ts";

const chalk = new Chalk({ level: 3 });

function getOllamaHttpBaseUrl(): string {
  const rawBaseUrl = process.env.OLLAMA_BASE_URL?.trim();
  if (!rawBaseUrl) return "http://127.0.0.1:11434";
  return rawBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

function getOllamaApiBaseUrl(): string {
  return `${getOllamaHttpBaseUrl()}/api`;
}

export async function resolveOllamaModel(): Promise<string> {
  if (process.env.OLLAMA_MODEL?.trim()) {
    return process.env.OLLAMA_MODEL.trim();
  }

  const response = await fetch(`${getOllamaHttpBaseUrl()}/api/tags`);
  if (!response.ok) {
    throw new Error(
      `Failed to reach Ollama at ${getOllamaHttpBaseUrl()} (${response.status} ${response.statusText})`
    );
  }

  const data = (await response.json()) as {
    models?: Array<{ name?: string; model?: string }>;
  };

  const modelId =
    data.models?.find((model) => model.model || model.name)?.model ??
    data.models?.find((model) => model.name)?.name;

  if (!modelId) {
    throw new Error(
      [
        `No Ollama models are installed at ${getOllamaHttpBaseUrl()}.`,
        "Run `ollama pull <model>` or set OLLAMA_MODEL to an installed model name.",
      ].join(" ")
    );
  }

  return modelId;
}

export async function createOllamaModel(ctx: SystemReminderContext) {
  const modelId = await resolveOllamaModel();
  const ollama = createOllama({ baseURL: getOllamaApiBaseUrl() });
  const model = wrapLanguageModel({
    model: ollama.chat(modelId),
    middleware: [createSystemRemindersMiddleware(ctx)],
  });
  return { model, modelId };
}

export function printTitle(title: string): void {
  console.log("");
  console.log(chalk.bold.cyan(`=== ${title} ===`));
  console.log("");
}

function indent(text: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function formatUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function printReminderSnapshot(
  label: string,
  reminders: SystemReminderDescriptor[]
): void {
  console.log(chalk.bold.magenta(`${label}:`));

  if (reminders.length === 0) {
    console.log(chalk.dim("  <none>"));
    console.log("");
    return;
  }

  for (const [index, reminder] of reminders.entries()) {
    const attributeText =
      reminder.attributes && Object.keys(reminder.attributes).length > 0
        ? ` ${JSON.stringify(reminder.attributes)}`
        : "";

    console.log(
      chalk.magenta(
        `  [${index}] <system-reminder type="${reminder.type}">${attributeText}`
      )
    );
    console.log(indent(chalk.white(reminder.content), 4));
    console.log(chalk.magenta("  </system-reminder>"));
  }

  console.log("");
}

type StepContent = Array<{
  type: string;
  toolName?: string;
  text?: string;
  input?: unknown;
  output?: unknown;
}>;

function printStepContent(content: StepContent): void {
  for (const part of content) {
    if (part.type === "tool-call") {
      console.log(
        chalk.yellow(
          `    tool-call ${part.toolName}(${formatUnknown(part.input)})`
        )
      );
      continue;
    }

    if (part.type === "tool-result") {
      console.log(chalk.gray(`    tool-result <- ${part.toolName}`));
      console.log(indent(chalk.gray(formatUnknown(part.output)), 6));
      continue;
    }

    if (part.type === "text") {
      console.log(indent(chalk.white(part.text ?? ""), 4));
      continue;
    }
  }
}

export function createStepCallbacks() {
  return {
    onStepFinish(event: { stepNumber: number; content: StepContent }) {
      console.log(chalk.bold.green(`  step ${event.stepNumber}`));
      printStepContent(event.content);
      console.log("");
    },
  };
}
