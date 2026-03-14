export interface SystemReminderDescriptor {
  type: string;
  content: string;
  attributes?: Record<string, string>;
}

export interface SystemReminderEmission {
  kind: string;
  content: string;
  attributes?: Record<string, string>;
  disposition?: "queue" | "defer";
}

export interface SystemReminderSink {
  emit(reminder: SystemReminderEmission, requestContext?: unknown): Promise<void> | void;
}

export type SystemReminderProvider<T> = (
  data: T | undefined
) =>
  | SystemReminderDescriptor
  | null
  | Promise<SystemReminderDescriptor | null>;

export interface SystemReminderContextOptions<T> {
  onCollect?: (reminders: SystemReminderDescriptor[]) => void;
  onProviderError?: (type: string, error: unknown) => void;
}

export interface SystemReminderContext<T = unknown> {
  registerProvider(type: string, fn: SystemReminderProvider<T>): void;
  removeProvider(type: string): boolean;
  setProviderData(data: T): void;

  queue(reminder: SystemReminderDescriptor): void;
  defer(reminder: SystemReminderDescriptor): void;
  advance(): void;

  collect(): Promise<SystemReminderDescriptor[]>;
  clear(): void;
}
