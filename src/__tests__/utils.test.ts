import { describe, expect, test } from "bun:test";
import {
  appendSystemReminderToMessage,
  combineSystemReminders,
  extractAllSystemReminderContents,
  extractSystemReminderContent,
  hasSystemReminder,
  wrapInSystemReminder,
} from "../index.js";

describe("system reminder helpers", () => {
  test("wraps content in system reminder tags", () => {
    expect(wrapInSystemReminder("Hello")).toBe(
      "<system-reminder>\nHello\n</system-reminder>"
    );
  });

  test("combines multiple reminder bodies", () => {
    expect(combineSystemReminders(["A", "B"])).toBe(
      "<system-reminder>\nA\n\nB\n</system-reminder>"
    );
  });

  test("appends reminder content to a string message", () => {
    expect(appendSystemReminderToMessage("Base", "Reminder")).toBe(
      "Base\n\n<system-reminder>\nReminder\n</system-reminder>"
    );
  });

  test("detects reminder tags", () => {
    expect(hasSystemReminder("X <system-reminder>Y</system-reminder> Z")).toBe(true);
    expect(hasSystemReminder("no tags")).toBe(false);
  });

  test("extracts a single reminder body", () => {
    expect(
      extractSystemReminderContent("<system-reminder>\nInner\n</system-reminder>")
    ).toBe("Inner");
  });

  test("extracts multiple reminder blocks and trailing text", () => {
    expect(
      extractAllSystemReminderContents(
        "<system-reminder>\nA\n</system-reminder>\n<system-reminder>\nB\n</system-reminder>\nTail"
      )
    ).toEqual(["A", "B", "Tail"]);
  });
});
