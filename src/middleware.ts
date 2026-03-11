import { applySystemRemindersToPrompt } from "./prompt.js";
import {
  getSystemRemindersRequest,
  stripSystemRemindersProviderOptions,
} from "./provider-options.js";
import {
  DEFAULT_SYSTEM_REMINDERS_PROVIDER_KEY,
  type SystemRemindersProviderOptions,
  type SystemRemindersMiddleware,
  type SystemRemindersMiddlewareConfig,
} from "./types.js";

export function createSystemRemindersMiddleware(
  config: SystemRemindersMiddlewareConfig
): SystemRemindersMiddleware {
  const providerOptionKey =
    config.providerOptionKey ?? DEFAULT_SYSTEM_REMINDERS_PROVIDER_KEY;
  const stripProviderOptions = config.stripProviderOptions ?? true;

  return {
    specificationVersion: "v3",
    async transformParams({ params }) {
      const request = getSystemRemindersRequest(
        params.providerOptions as SystemRemindersProviderOptions | undefined,
        providerOptionKey
      );

      if (!request) {
        return params;
      }

      return {
        ...params,
        prompt: applySystemRemindersToPrompt(params.prompt, request.reminders),
        providerOptions: stripProviderOptions
          ? stripSystemRemindersProviderOptions(
              params.providerOptions as SystemRemindersProviderOptions | undefined,
              providerOptionKey
            )
          : params.providerOptions,
      };
    },
  };
}

export const systemReminders = createSystemRemindersMiddleware;
