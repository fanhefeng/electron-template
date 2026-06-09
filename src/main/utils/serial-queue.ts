/**
 * Serializes async tasks: each task starts only after the previous one settled.
 * Used to make read-modify-write sequences on shared state (settings cache,
 * custom theme list + their JSON files) atomic with respect to each other, so
 * concurrent IPC calls from multiple windows cannot interleave and lose updates.
 */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    // Keep the chain alive even when a task rejects; the rejection still
    // propagates to the caller of run().
    this.tail = result.catch(() => undefined);
    return result;
  }
}
