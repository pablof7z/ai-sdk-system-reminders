import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";
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
  const ignoreUnknownTags = config.ignoreUnknownTags ?? true;
  const stripProviderOptions = config.stripProviderOptions ?? true;

  return {
    specificationVersion: "v3",
    async transformParams({ params, type, model }) {
      const request = getSystemRemindersRequest(
        params.providerOptions as SystemRemindersProviderOptions | undefined,
        providerOptionKey
      );

      if (!request) {
        return params;
      }

      const reminderContents = await config.registry.resolve(
        request.tags,
        {
          metadata: request.metadata,
          params: params as LanguageModelV3CallOptions,
          type,
          model: {
            provider: model.provider,
            modelId: model.modelId,
          },
        },
        { ignoreUnknownTags }
      );

      return {
        ...params,
        prompt: applySystemRemindersToPrompt(params.prompt, reminderContents),
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
