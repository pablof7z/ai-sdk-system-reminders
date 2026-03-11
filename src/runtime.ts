import type {
  CollectSystemRemindersInput,
  QueueSystemReminderInput,
  QueuedSystemReminder,
  SystemReminderDescriptor,
  SystemReminderProducer,
  SystemReminderProducerResult,
  SystemReminderQueueFilter,
  SystemReminderRuntime,
} from "./types.js";

function normalizeDescriptor(
  reminder: SystemReminderDescriptor
): SystemReminderDescriptor | null {
  const type = reminder.type.trim();
  const content = reminder.content.trim();

  if (!type || !content) {
    return null;
  }

  const attributes = reminder.attributes
    ? Object.fromEntries(
        Object.entries(reminder.attributes).filter(
          ([key, value]) => key.trim() !== "" && value.trim() !== ""
        )
      )
    : undefined;

  return {
    type,
    content,
    ...(attributes && Object.keys(attributes).length > 0 ? { attributes } : {}),
  };
}

function normalizeDescriptors(
  result: SystemReminderProducerResult
): SystemReminderDescriptor[] {
  if (!result) {
    return [];
  }

  const reminders = Array.isArray(result) ? result : [result];

  return reminders
    .map((reminder) => normalizeDescriptor(reminder))
    .filter((reminder): reminder is SystemReminderDescriptor => reminder !== null);
}

function matchesScope<Scope>(
  currentScope: Scope,
  queuedScope: Partial<Scope> | undefined
): boolean {
  if (!queuedScope) {
    return true;
  }

  return Object.entries(queuedScope).every(([key, value]) => {
    return (currentScope as Record<string, unknown>)[key] === value;
  });
}

function matchesFilter<Scope>(
  reminder: QueuedSystemReminder<Scope>,
  filter: SystemReminderQueueFilter<Scope>
): boolean {
  if (filter.type && reminder.type !== filter.type) {
    return false;
  }

  if (filter.delivery && reminder.delivery !== filter.delivery) {
    return false;
  }

  if (filter.cycleId && reminder.cycleId !== filter.cycleId) {
    return false;
  }

  if (filter.scope && !matchesScope(reminder.scope, filter.scope)) {
    return false;
  }

  return true;
}

export function createSystemReminderRuntime<Scope extends object, Context>(): SystemReminderRuntime<
  Scope,
  Context
> {
  const producers = new Map<string, SystemReminderProducer<Scope, Context>>();
  const queuedReminders: Array<QueuedSystemReminder<Scope>> = [];
  let nextQueuedId = 1;

  return {
    register(producer) {
      if (producers.has(producer.id)) {
        throw new Error(
          `System reminder producer "${producer.id}" is already registered`
        );
      }

      producers.set(producer.id, producer);
      return this;
    },

    unregister(id) {
      return producers.delete(id);
    },

    queue(reminder: QueueSystemReminderInput<Scope>) {
      const normalized = normalizeDescriptor(reminder);
      if (!normalized) {
        throw new Error("Queued system reminders require non-empty type and content");
      }

      const id = `system-reminder-${nextQueuedId++}`;
      queuedReminders.push({
        ...normalized,
        scope: reminder.scope,
        cycleId: reminder.cycleId,
        delivery: reminder.delivery,
        id,
      });
      return id;
    },

    dismiss(id) {
      const index = queuedReminders.findIndex((reminder) => reminder.id === id);
      if (index === -1) {
        return false;
      }

      queuedReminders.splice(index, 1);
      return true;
    },

    clearQueued(filter) {
      if (!filter) {
        const cleared = queuedReminders.length;
        queuedReminders.length = 0;
        return cleared;
      }

      let removed = 0;
      for (let index = queuedReminders.length - 1; index >= 0; index--) {
        if (matchesFilter(queuedReminders[index], filter)) {
          queuedReminders.splice(index, 1);
          removed++;
        }
      }

      return removed;
    },

    async collect(input: CollectSystemRemindersInput<Scope, Context>) {
      const computed: SystemReminderDescriptor[] = [];

      for (const producer of producers.values()) {
        const producerInput = {
          scope: input.scope,
          context: input.context,
          cycleId: input.cycleId,
        };

        if (producer.matches) {
          const matches = await producer.matches(producerInput);
          if (!matches) {
            continue;
          }
        }

        computed.push(...normalizeDescriptors(await producer.resolve(producerInput)));
      }

      const queued: SystemReminderDescriptor[] = [];
      const consumedIds = new Set<string>();
      const staleCurrentCycleIds = new Set<string>();

      for (const reminder of queuedReminders) {
        if (!matchesScope(input.scope, reminder.scope)) {
          continue;
        }

        if (reminder.delivery === "current-cycle") {
          if (reminder.cycleId === input.cycleId) {
            queued.push(normalizeDescriptor(reminder)!);
            consumedIds.add(reminder.id);
          } else {
            staleCurrentCycleIds.add(reminder.id);
          }
          continue;
        }

        if (reminder.cycleId !== input.cycleId) {
          queued.push(normalizeDescriptor(reminder)!);
          consumedIds.add(reminder.id);
        }
      }

      if (consumedIds.size > 0 || staleCurrentCycleIds.size > 0) {
        for (let index = queuedReminders.length - 1; index >= 0; index--) {
          const id = queuedReminders[index].id;
          if (consumedIds.has(id) || staleCurrentCycleIds.has(id)) {
            queuedReminders.splice(index, 1);
          }
        }
      }

      return [...computed, ...queued];
    },
  };
}
