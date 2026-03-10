export { createSystemReminderRegistry } from "./registry.js";
export {
  createSystemRemindersMiddleware,
  systemReminders,
} from "./middleware.js";
export {
  createSystemRemindersProviderOptions,
  getSystemRemindersRequest,
  stripSystemRemindersProviderOptions,
} from "./provider-options.js";
export { applySystemRemindersToPrompt } from "./prompt.js";
export {
  wrapInSystemReminder,
  combineSystemReminders,
  appendSystemReminderToMessage,
  hasSystemReminder,
  extractSystemReminderContent,
  extractAllSystemReminderContents,
  normalizeSystemReminderContents,
} from "./utils.js";

export type {
  CreateSystemReminderRegistryOptions,
  CreateSystemRemindersProviderOptionsInput,
  ResolveSystemReminderOptions,
  SystemReminderContext,
  SystemReminderRegistryEntries,
  SystemReminderRegistry,
  SystemReminderResolver,
  SystemReminderValue,
  SystemRemindersMiddleware,
  SystemRemindersMiddlewareConfig,
  SystemRemindersRequest,
  SystemReminderPrompt,
} from "./types.js";

export { DEFAULT_SYSTEM_REMINDERS_PROVIDER_KEY } from "./types.js";
