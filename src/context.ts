import type {
  SystemReminderContext,
  SystemReminderContextOptions,
  SystemReminderDescriptor,
  SystemReminderProvider,
} from "./types.js";

export function createSystemReminderContext<T = unknown>(
  options?: SystemReminderContextOptions<T>
): SystemReminderContext<T> {
  const providers = new Map<string, SystemReminderProvider<T>>();
  let providerData: T | undefined;
  let queued: SystemReminderDescriptor[] = [];
  let deferred: SystemReminderDescriptor[] = [];

  function registerProvider(type: string, fn: SystemReminderProvider<T>): void {
    providers.set(type, fn);
  }

  function removeProvider(type: string): boolean {
    return providers.delete(type);
  }

  function setProviderData(data: T): void {
    providerData = data;
  }

  function queue(reminder: SystemReminderDescriptor): void {
    queued.push(reminder);
  }

  function defer(reminder: SystemReminderDescriptor): void {
    deferred.push(reminder);
  }

  function advance(): void {
    queued = queued.concat(deferred);
    deferred = [];
  }

  async function collect(): Promise<SystemReminderDescriptor[]> {
    const result: SystemReminderDescriptor[] = [];

    for (const [type, fn] of providers) {
      try {
        const descriptor = await fn(providerData);
        if (descriptor) {
          result.push(descriptor);
        }
      } catch (error) {
        options?.onProviderError?.(type, error);
      }
    }

    result.push(...queued);
    queued = [];

    options?.onCollect?.(result);

    return result;
  }

  function clear(): void {
    providerData = undefined;
    queued = [];
    deferred = [];
  }

  return {
    registerProvider,
    removeProvider,
    setProviderData,
    queue,
    defer,
    advance,
    collect,
    clear,
  };
}
