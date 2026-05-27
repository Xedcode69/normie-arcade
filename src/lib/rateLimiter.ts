type Task<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export class RateLimiter {
  private queue: Task<unknown>[] = [];
  private timestamps: number[] = [];
  private active = false;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  enqueue<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ run, resolve: resolve as (value: unknown) => void, reject });
      void this.drain();
    });
  }

  private async drain() {
    if (this.active) return;
    this.active = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((time) => now - time < this.windowMs);

      if (this.timestamps.length >= this.limit) {
        const waitMs = this.windowMs - (now - this.timestamps[0]) + 25;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      const task = this.queue.shift();
      if (!task) continue;

      this.timestamps.push(Date.now());
      task
        .run()
        .then(task.resolve)
        .catch(task.reject);
    }

    this.active = false;
  }
}
