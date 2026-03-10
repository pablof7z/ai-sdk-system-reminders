import type {
  JSONObject,
  LanguageModelV3CallOptions,
  LanguageModelV3Message,
  LanguageModelV3Middleware,
  SharedV3ProviderOptions,
} from "@ai-sdk/provider";

export const DEFAULT_SYSTEM_REMINDERS_PROVIDER_KEY = "systemReminders";

export interface SystemRemindersRequest {
  tags: string[];
  metadata?: JSONObject;
}

export interface SystemReminderContext {
  tag: string;
  metadata?: JSONObject;
  params: LanguageModelV3CallOptions;
  type: string;
  model: {
    provider: string;
    modelId: string;
  };
}

export type SystemReminderValue =
  | string
  | string[]
  | null
  | undefined;

export type SystemReminderResolver =
  | SystemReminderValue
  | ((context: SystemReminderContext) => Promise<SystemReminderValue> | SystemReminderValue);

export type SystemReminderRegistryEntries =
  | Record<string, SystemReminderResolver>
  | Iterable<[string, SystemReminderResolver]>;

export interface ResolveSystemReminderOptions {
  ignoreUnknownTags?: boolean;
}

export interface SystemReminderRegistry {
  register(tag: string, resolver: SystemReminderResolver): SystemReminderRegistry;
  unregister(tag: string): boolean;
  clear(): void;
  has(tag: string): boolean;
  get(tag: string): SystemReminderResolver | undefined;
  entries(): IterableIterator<[string, SystemReminderResolver]>;
  resolve(
    tags: string[],
    context: Omit<SystemReminderContext, "tag">,
    options?: ResolveSystemReminderOptions
  ): Promise<string[]>;
}

export interface CreateSystemReminderRegistryOptions {
  initialEntries?: SystemReminderRegistryEntries;
}

export interface SystemRemindersMiddlewareConfig {
  registry: SystemReminderRegistry;
  providerOptionKey?: string;
  ignoreUnknownTags?: boolean;
  stripProviderOptions?: boolean;
}

export interface CreateSystemRemindersProviderOptionsInput extends SystemRemindersRequest {
  providerOptionKey?: string;
}

export type SystemRemindersMiddleware = LanguageModelV3Middleware;
export type SystemReminderPrompt = LanguageModelV3Message[];
export type SystemRemindersProviderOptions = SharedV3ProviderOptions;
