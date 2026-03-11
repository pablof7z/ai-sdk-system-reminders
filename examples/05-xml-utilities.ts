import {
  appendSystemReminderToMessage,
  applySystemRemindersToPrompt,
  combineSystemReminders,
  extractAllSystemReminders,
  extractSystemReminder,
  wrapInSystemReminder,
} from "../src/index.ts";
import { printJson, printText, printTitle } from "./helpers.ts";

async function main() {
  printTitle("Example 05: XML helpers");

  const todoReminder = {
    type: "todo-list",
    content: "# Current Todos\n- Confirm the rollout status",
  };
  const heuristicReminder = {
    type: "heuristic",
    content: "Do not mark the task done until you verify the fix.",
  };

  const wrapped = wrapInSystemReminder(todoReminder);
  const combined = combineSystemReminders([todoReminder, heuristicReminder]);
  const appended = appendSystemReminderToMessage("Base user message", [
    todoReminder,
    heuristicReminder,
  ]);

  const parsedSingle = extractSystemReminder(wrapped);
  const parsedLegacy = extractAllSystemReminders(
    "<system-reminder>\nLegacy reminder\n</system-reminder>\nTrailing text",
    "legacy"
  );

  const prompt = applySystemRemindersToPrompt(
    [
      {
        role: "user",
        content: [{ type: "text", text: "Please continue the investigation." }],
      },
    ],
    [todoReminder, heuristicReminder]
  );

  printText("wrapped", wrapped);
  printText("combined", combined);
  printText("appended message", appended);
  printJson("parsed single", parsedSingle);
  printJson("parsed legacy", parsedLegacy);
  printJson("prompt with reminders", prompt);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
