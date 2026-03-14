import type {
  SystemReminderContext,
  SystemReminderDescriptor,
  SystemReminderEmission,
  SystemReminderSink,
} from "./types.js";

function toDescriptor(reminder: SystemReminderEmission): SystemReminderDescriptor {
  return {
    type: reminder.kind,
    content: reminder.content,
    ...(reminder.attributes ? { attributes: reminder.attributes } : {}),
  };
}

export function createSystemReminderSink(
  context: Pick<SystemReminderContext<unknown>, "queue" | "defer">
): SystemReminderSink {
  return {
    emit(reminder: SystemReminderEmission) {
      const descriptor = toDescriptor(reminder);

      if (reminder.disposition === "defer") {
        context.defer(descriptor);
        return;
      }

      context.queue(descriptor);
    },
  };
}
