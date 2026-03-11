import type {
  LanguageModelV3Message,
  LanguageModelV3Middleware,
  SharedV3ProviderOptions,
} from "@ai-sdk/provider";

export const DEFAULT_SYSTEM_REMINDERS_PROVIDER_KEY = "systemReminders";

export interface SystemReminderDescriptor {
  type: string;
  content: string;
  attributes?: Record<string, string>;
}

export interface SystemRemindersRequest {
  reminders: SystemReminderDescriptor[];
}

export interface SystemRemindersMiddlewareConfig {
  providerOptionKey?: string;
  stripProviderOptions?: boolean;
}

export interface CreateSystemRemindersProviderOptionsInput
  extends SystemRemindersRequest {
  providerOptionKey?: string;
}

export type SystemReminderProducerResult =
  | SystemReminderDescriptor
  | SystemReminderDescriptor[]
  | null
  | undefined;

export interface SystemReminderProducerContext<Scope, Context> {
  scope: Scope;
  context: Context;
  cycleId: string;
}

export interface SystemReminderProducer<Scope, Context> {
  id: string;
  matches?: (
    input: SystemReminderProducerContext<Scope, Context>
  ) => boolean | Promise<boolean>;
  resolve: (
    input: SystemReminderProducerContext<Scope, Context>
  ) => SystemReminderProducerResult | Promise<SystemReminderProducerResult>;
}

export type SystemReminderDelivery = "current-cycle" | "next-cycle";

export interface QueueSystemReminderInput<Scope> extends SystemReminderDescriptor {
  scope: Partial<Scope>;
  cycleId: string;
  delivery: SystemReminderDelivery;
  attributes?: Record<string, string>;
}

export interface QueuedSystemReminder<Scope>
  extends QueueSystemReminderInput<Scope> {
  id: string;
}

export interface SystemReminderQueueFilter<Scope> {
  scope?: Partial<Scope>;
  type?: string;
  delivery?: SystemReminderDelivery;
  cycleId?: string;
}

export interface CollectSystemRemindersInput<Scope, Context> {
  scope: Scope;
  context: Context;
  cycleId: string;
}

export interface SystemReminderRuntime<Scope, Context> {
  register(
    producer: SystemReminderProducer<Scope, Context>
  ): SystemReminderRuntime<Scope, Context>;
  unregister(id: string): boolean;
  queue(reminder: QueueSystemReminderInput<Scope>): string;
  dismiss(id: string): boolean;
  clearQueued(filter?: SystemReminderQueueFilter<Scope>): number;
  collect(
    input: CollectSystemRemindersInput<Scope, Context>
  ): Promise<SystemReminderDescriptor[]>;
}

export type SystemRemindersMiddleware = LanguageModelV3Middleware;
export type SystemReminderPrompt = LanguageModelV3Message[];
export type SystemRemindersProviderOptions = SharedV3ProviderOptions;
