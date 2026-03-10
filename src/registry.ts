import type {
  CreateSystemReminderRegistryOptions,
  ResolveSystemReminderOptions,
  SystemReminderContext,
  SystemReminderRegistryEntries,
  SystemReminderRegistry,
  SystemReminderResolver,
  SystemReminderValue,
} from "./types.js";

function normalizeResolvedValue(value: SystemReminderValue): string[] {
  if (value == null) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function createEntries(
  initialEntries: SystemReminderRegistryEntries | undefined
): Map<string, SystemReminderResolver> {
  if (!initialEntries) {
    return new Map();
  }

  if (Symbol.iterator in Object(initialEntries) && !Array.isArray(initialEntries)) {
    return new Map(initialEntries as Iterable<[string, SystemReminderResolver]>);
  }

  return new Map(Object.entries(initialEntries as Record<string, SystemReminderResolver>));
}

function resolveInitialEntries(
  input: SystemReminderRegistryEntries | CreateSystemReminderRegistryOptions | undefined
): SystemReminderRegistryEntries | undefined {
  if (!input) {
    return undefined;
  }

  const maybeOptions = input as CreateSystemReminderRegistryOptions;
  if ("initialEntries" in maybeOptions && maybeOptions.initialEntries !== undefined) {
    return maybeOptions.initialEntries;
  }

  return input as SystemReminderRegistryEntries;
}

export function createSystemReminderRegistry(
  input: SystemReminderRegistryEntries | CreateSystemReminderRegistryOptions = {}
): SystemReminderRegistry {
  const entries = createEntries(resolveInitialEntries(input));

  return {
    register(tag, resolver) {
      entries.set(tag, resolver);
      return this;
    },

    unregister(tag) {
      return entries.delete(tag);
    },

    clear() {
      entries.clear();
    },

    has(tag) {
      return entries.has(tag);
    },

    get(tag) {
      return entries.get(tag);
    },

    entries() {
      return entries.entries();
    },

    async resolve(
      tags: string[],
      context: Omit<SystemReminderContext, "tag">,
      options: ResolveSystemReminderOptions = {}
    ): Promise<string[]> {
      const ignoreUnknownTags = options.ignoreUnknownTags ?? true;
      const results: string[] = [];

      for (const tag of tags) {
        const entry = entries.get(tag);
        if (!entry) {
          if (ignoreUnknownTags) {
            continue;
          }
          throw new Error(`Unknown system reminder tag: ${tag}`);
        }

        const resolvedValue =
          typeof entry === "function"
            ? await entry({ ...context, tag })
            : entry;

        results.push(...normalizeResolvedValue(resolvedValue));
      }

      return results;
    },
  };
}
