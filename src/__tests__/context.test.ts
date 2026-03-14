import { describe, expect, it } from "bun:test";
import { createSystemReminderContext } from "../context.js";
import { createSystemReminderSink } from "../sink.js";

describe("SystemReminderContext", () => {
  describe("registerProvider / collect", () => {
    it("runs a registered provider on every collect()", async () => {
      const ctx = createSystemReminderContext<{ name: string }>();
      ctx.registerProvider("greeting", (data) =>
        data ? { type: "greeting", content: `hello ${data.name}` } : null
      );
      ctx.setProviderData({ name: "world" });

      expect(await ctx.collect()).toEqual([{ type: "greeting", content: "hello world" }]);
      expect(await ctx.collect()).toEqual([{ type: "greeting", content: "hello world" }]);
    });

    it("replaces a provider when registered with the same type", async () => {
      const ctx = createSystemReminderContext();
      ctx.registerProvider("rules", () => ({ type: "rules", content: "v1" }));
      ctx.registerProvider("rules", () => ({ type: "rules", content: "v2" }));

      expect(await ctx.collect()).toEqual([{ type: "rules", content: "v2" }]);
    });

    it("passes undefined when providerData has not been set", async () => {
      const ctx = createSystemReminderContext<string>();
      let received: string | undefined = "sentinel";
      ctx.registerProvider("check", (data) => {
        received = data;
        return null;
      });

      await ctx.collect();
      expect(received).toBeUndefined();
    });

    it("supports async providers", async () => {
      const ctx = createSystemReminderContext();
      ctx.registerProvider("async", async () => {
        await new Promise((r) => setTimeout(r, 1));
        return { type: "async", content: "resolved" };
      });

      expect(await ctx.collect()).toEqual([{ type: "async", content: "resolved" }]);
    });

    it("skips providers that return null", async () => {
      const ctx = createSystemReminderContext();
      ctx.registerProvider("noop", () => null);
      ctx.registerProvider("real", () => ({ type: "real", content: "yes" }));

      expect(await ctx.collect()).toEqual([{ type: "real", content: "yes" }]);
    });

    it("calls onProviderError and skips on provider error", async () => {
      const errors: Array<{ type: string; error: unknown }> = [];
      const ctx = createSystemReminderContext({
        onProviderError(type, error) {
          errors.push({ type, error });
        },
      });
      ctx.registerProvider("bad", () => {
        throw new Error("boom");
      });
      ctx.registerProvider("good", () => ({ type: "good", content: "ok" }));

      const result = await ctx.collect();
      expect(result).toEqual([{ type: "good", content: "ok" }]);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe("bad");
      expect((errors[0].error as Error).message).toBe("boom");
    });

    it("calls onCollect with the final reminder list", async () => {
      let collected: unknown;
      const ctx = createSystemReminderContext({
        onCollect(reminders) {
          collected = reminders;
        },
      });
      ctx.registerProvider("a", () => ({ type: "a", content: "1" }));
      ctx.queue({ type: "b", content: "2" });

      await ctx.collect();
      expect(collected).toEqual([
        { type: "a", content: "1" },
        { type: "b", content: "2" },
      ]);
    });
  });

  describe("removeProvider", () => {
    it("removes a registered provider", async () => {
      const ctx = createSystemReminderContext();
      ctx.registerProvider("rules", () => ({ type: "rules", content: "yes" }));
      expect(ctx.removeProvider("rules")).toBe(true);
      expect(await ctx.collect()).toEqual([]);
    });

    it("returns false for nonexistent type", () => {
      const ctx = createSystemReminderContext();
      expect(ctx.removeProvider("nope")).toBe(false);
    });
  });

  describe("setProviderData", () => {
    it("updates data seen by providers", async () => {
      const ctx = createSystemReminderContext<{ v: number }>();
      ctx.registerProvider("ver", (data) =>
        data ? { type: "ver", content: String(data.v) } : null
      );

      ctx.setProviderData({ v: 1 });
      expect(await ctx.collect()).toEqual([{ type: "ver", content: "1" }]);

      ctx.setProviderData({ v: 2 });
      expect(await ctx.collect()).toEqual([{ type: "ver", content: "2" }]);
    });
  });

  describe("queue (one-shot)", () => {
    it("returns queued item once then drains it", async () => {
      const ctx = createSystemReminderContext();
      ctx.queue({ type: "nudge", content: "check todos" });

      expect(await ctx.collect()).toEqual([{ type: "nudge", content: "check todos" }]);
      expect(await ctx.collect()).toEqual([]);
    });

    it("returns multiple queued items in FIFO order", async () => {
      const ctx = createSystemReminderContext();
      ctx.queue({ type: "a", content: "first" });
      ctx.queue({ type: "b", content: "second" });

      const result = await ctx.collect();
      expect(result).toEqual([
        { type: "a", content: "first" },
        { type: "b", content: "second" },
      ]);
    });
  });

  describe("defer / advance", () => {
    it("deferred items are not returned by collect() until advance()", async () => {
      const ctx = createSystemReminderContext();
      ctx.defer({ type: "result", content: "done" });

      expect(await ctx.collect()).toEqual([]);

      ctx.advance();
      expect(await ctx.collect()).toEqual([{ type: "result", content: "done" }]);
    });

    it("after advance + collect, deferred items are drained", async () => {
      const ctx = createSystemReminderContext();
      ctx.defer({ type: "result", content: "done" });
      ctx.advance();
      await ctx.collect(); // drains

      expect(await ctx.collect()).toEqual([]);
    });
  });

  describe("collect ordering", () => {
    it("returns provider results first, then queued", async () => {
      const ctx = createSystemReminderContext();
      ctx.registerProvider("persistent", () => ({
        type: "persistent",
        content: "always here",
      }));
      ctx.queue({ type: "oneshot", content: "just once" });

      expect(await ctx.collect()).toEqual([
        { type: "persistent", content: "always here" },
        { type: "oneshot", content: "just once" },
      ]);
    });
  });

  describe("clear", () => {
    it("resets providerData, queued, and deferred but NOT providers", async () => {
      const ctx = createSystemReminderContext<{ v: number }>();
      ctx.registerProvider("check", (data) =>
        data ? { type: "check", content: String(data.v) } : null
      );
      ctx.setProviderData({ v: 42 });
      ctx.queue({ type: "q", content: "queued" });
      ctx.defer({ type: "d", content: "deferred" });

      ctx.clear();
      ctx.advance(); // should be no-op since deferred was cleared

      // Provider still registered but data is cleared, so returns null
      expect(await ctx.collect()).toEqual([]);

      // Provider still works when data is set again
      ctx.setProviderData({ v: 99 });
      expect(await ctx.collect()).toEqual([{ type: "check", content: "99" }]);
    });
  });

  describe("createSystemReminderSink", () => {
    it("queues immediate reminder emissions", async () => {
      const ctx = createSystemReminderContext();
      const sink = createSystemReminderSink(ctx);

      sink.emit({
        kind: "rules",
        content: "be concise",
      });

      expect(await ctx.collect()).toEqual([{ type: "rules", content: "be concise" }]);
    });

    it("defers reminder emissions marked for the next run", async () => {
      const ctx = createSystemReminderContext();
      const sink = createSystemReminderSink(ctx);

      sink.emit({
        kind: "follow-up",
        content: "check the delegation result next turn",
        disposition: "defer",
      });

      expect(await ctx.collect()).toEqual([]);
      ctx.advance();
      expect(await ctx.collect()).toEqual([
        { type: "follow-up", content: "check the delegation result next turn" },
      ]);
    });
  });
});
