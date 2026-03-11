import { describe, expect, test } from "bun:test";
import {
  appendSystemReminderToMessage,
  combineSystemReminders,
  extractAllSystemReminderContents,
  extractAllSystemReminders,
  extractSystemReminder,
  extractSystemReminderContent,
  hasSystemReminder,
  wrapInSystemReminder,
} from "../index.js";

describe("system reminder helpers", () => {
  test("wraps typed content in system reminder tags", () => {
    expect(
      wrapInSystemReminder({
        type: "todo-list",
        content: "Hello",
      })
    ).toBe('<system-reminder type="todo-list">\nHello\n</system-reminder>');
  });

  test("combines multiple typed reminders as separate blocks", () => {
    expect(
      combineSystemReminders([
        { type: "todo-list", content: "A" },
        { type: "delegations", content: "B" },
      ])
    ).toBe(
      '<system-reminder type="todo-list">\nA\n</system-reminder>\n\n' +
        '<system-reminder type="delegations">\nB\n</system-reminder>'
    );
  });

  test("appends typed reminder content to a string message", () => {
    expect(
      appendSystemReminderToMessage("Base", {
        type: "heuristic",
        content: "Reminder",
      })
    ).toBe(
      'Base\n\n<system-reminder type="heuristic">\nReminder\n</system-reminder>'
    );
  });

  test("detects bare and typed reminder tags", () => {
    expect(
      hasSystemReminder('X <system-reminder type="agents-md">Y</system-reminder> Z')
    ).toBe(true);
    expect(hasSystemReminder("X <system-reminder>Y</system-reminder> Z")).toBe(true);
    expect(hasSystemReminder("no tags")).toBe(false);
  });

  test("extracts a structured reminder from a typed block", () => {
    expect(
      extractSystemReminder(
        '<system-reminder type="agents-md">\nInner\n</system-reminder>'
      )
    ).toEqual({
      type: "agents-md",
      content: "Inner",
      attributes: {
        type: "agents-md",
      },
    });
  });

  test("extracts legacy bare reminders with a fallback type", () => {
    expect(
      extractAllSystemReminders(
        "<system-reminder>\nLegacy\n</system-reminder>\nTrailing text",
        "heuristic"
      )
    ).toEqual([
      {
        type: "heuristic",
        content: "Legacy",
      },
      {
        type: "heuristic",
        content: "Trailing text",
      },
    ]);
  });

  test("extracts a single reminder body", () => {
    expect(
      extractSystemReminderContent(
        '<system-reminder type="todo-list">\nInner\n</system-reminder>'
      )
    ).toBe("Inner");
  });

  test("extracts multiple reminder blocks and trailing text", () => {
    expect(
      extractAllSystemReminderContents(
        '<system-reminder type="todo-list">\nA\n</system-reminder>\n' +
          '<system-reminder type="delegations">\nB\n</system-reminder>\nTail'
      )
    ).toEqual(["A", "B", "Tail"]);
  });
});
