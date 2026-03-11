import { describe, expect, it } from "bun:test";
import {
  wrapInSystemReminder,
  combineSystemReminders,
  extractSystemReminder,
  extractAllSystemReminders,
  hasSystemReminder,
} from "../xml.js";

describe("wrapInSystemReminder", () => {
  it("produces valid XML with type attribute", () => {
    const result = wrapInSystemReminder({ type: "rules", content: "be nice" });
    expect(result).toBe(
      '<system-reminder type="rules">\nbe nice\n</system-reminder>'
    );
  });

  it("includes custom attributes", () => {
    const result = wrapInSystemReminder({
      type: "rules",
      content: "be nice",
      attributes: { scope: "global" },
    });
    expect(result).toContain('scope="global"');
    expect(result).toContain('type="rules"');
    expect(result).toContain("be nice");
  });

  it("returns empty string for empty content", () => {
    expect(wrapInSystemReminder({ type: "rules", content: "  " })).toBe("");
  });

  it("returns empty string for empty type", () => {
    expect(wrapInSystemReminder({ type: "  ", content: "hello" })).toBe("");
  });
});

describe("combineSystemReminders", () => {
  it("joins multiple reminders with double newlines", () => {
    const result = combineSystemReminders([
      { type: "a", content: "first" },
      { type: "b", content: "second" },
    ]);
    expect(result).toContain('<system-reminder type="a">');
    expect(result).toContain('<system-reminder type="b">');
    expect(result).toContain("first");
    expect(result).toContain("second");

    // Two blocks separated by double newline
    const blocks = result.split("</system-reminder>");
    expect(blocks.length).toBe(3); // two blocks + trailing empty
  });

  it("filters out invalid reminders", () => {
    const result = combineSystemReminders([
      { type: "valid", content: "yes" },
      { type: "", content: "no type" },
      { type: "also-valid", content: "yes too" },
    ]);
    expect(result).toContain("valid");
    expect(result).toContain("also-valid");
    expect(result).not.toContain("no type");
  });
});

describe("extractSystemReminder", () => {
  it("parses a single system-reminder block", () => {
    const xml =
      '<system-reminder type="rules">\nbe nice\n</system-reminder>';
    const result = extractSystemReminder(xml);
    expect(result).toEqual({
      type: "rules",
      content: "be nice",
      attributes: { type: "rules" },
    });
  });

  it("uses fallback type when no type attribute", () => {
    const xml = "<system-reminder>\nhello\n</system-reminder>";
    const result = extractSystemReminder(xml, "fallback");
    expect(result).toEqual({ type: "fallback", content: "hello" });
  });

  it("returns null for non-matching content", () => {
    expect(extractSystemReminder("just plain text")).toBeNull();
  });
});

describe("extractAllSystemReminders", () => {
  it("parses multiple blocks", () => {
    const xml = [
      '<system-reminder type="a">\nfirst\n</system-reminder>',
      '<system-reminder type="b">\nsecond\n</system-reminder>',
    ].join("\n\n");

    const result = extractAllSystemReminders(xml);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("a");
    expect(result[0].content).toBe("first");
    expect(result[1].type).toBe("b");
    expect(result[1].content).toBe("second");
  });
});

describe("hasSystemReminder", () => {
  it("detects presence", () => {
    expect(
      hasSystemReminder(
        '<system-reminder type="x">\nhello\n</system-reminder>'
      )
    ).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasSystemReminder("no reminders here")).toBe(false);
  });
});

describe("attribute escaping", () => {
  it("round-trips special characters in attributes", () => {
    const reminder = {
      type: "test",
      content: "hello",
      attributes: { path: '/home/user/"docs"' },
    };

    const wrapped = wrapInSystemReminder(reminder);
    const extracted = extractSystemReminder(wrapped);

    expect(extracted).not.toBeNull();
    expect(extracted!.attributes?.path).toBe('/home/user/"docs"');
  });

  it("handles ampersands and angle brackets", () => {
    const reminder = {
      type: "test",
      content: "hello",
      attributes: { expr: "a < b && c > d" },
    };

    const wrapped = wrapInSystemReminder(reminder);
    expect(wrapped).toContain("&lt;");
    expect(wrapped).toContain("&amp;");
    expect(wrapped).toContain("&gt;");

    const extracted = extractSystemReminder(wrapped);
    expect(extracted!.attributes?.expr).toBe("a < b && c > d");
  });
});
