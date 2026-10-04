import { GitLabApiError } from "./client";

const MAX_CONCURRENT_REQUESTS = 2;
const MIN_REQUEST_INTERVAL_MS = 50;
const MAX_RATE_LIMIT_RETRIES = 4;
const DEFAULT_RETRY_DELAY_MS = 1000;

interface QueueJob<T> {
  run: () => Promise<T>;
  signal?: AbortSignal;
  attempts: number;
  settled: boolean;
  onAbort?: () => void;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

class FileContentRequestQueue {
  private readonly pending: QueueJob<unknown>[] = [];
  private activeRequests = 0;
  private nextRequestAt = 0;
  private blockedUntil = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  enqueue<T>(run: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const job: QueueJob<T> = {
        run,
        signal,
        attempts: 0,
        settled: false,
        resolve,
        reject,
      };

      if (signal?.aborted) {
        this.settle(job, "reject", new DOMException("Aborted", "AbortError"));
        return;
      }

      if (signal) {
        job.onAbort = () => {
          const index = this.pending.indexOf(job as QueueJob<unknown>);
          if (index >= 0) {
            this.pending.splice(index, 1);
            this.settle(job, "reject", new DOMException("Aborted", "AbortError"));
            this.pump();
          }
        };
        signal.addEventListener("abort", job.onAbort, { once: true });
      }

      this.pending.push(job as QueueJob<unknown>);
      this.pump();
    });
  }

  private pump() {
    if (this.timer !== null) {
      return;
    }

    while (this.activeRequests < MAX_CONCURRENT_REQUESTS && this.pending.length) {
      const now = Date.now();
      const nextStartAt = Math.max(this.nextRequestAt, this.blockedUntil);
      if (nextStartAt > now) {
        this.timer = setTimeout(() => {
          this.timer = null;
          this.pump();
        }, nextStartAt - now);
        return;
      }

      const job = this.pending.shift()!;
      if (job.signal?.aborted) {
        this.settle(job, "reject", new DOMException("Aborted", "AbortError"));
        continue;
      }

      this.activeRequests += 1;
      this.nextRequestAt = now + MIN_REQUEST_INTERVAL_MS;
      void this.run(job);
    }
  }

  private async run(job: QueueJob<unknown>) {
    try {
      const result = await job.run();
      this.settle(job, "resolve", result);
    } catch (error) {
      if (
        error instanceof GitLabApiError &&
        error.status === 429 &&
        job.attempts < MAX_RATE_LIMIT_RETRIES &&
        !job.signal?.aborted
      ) {
        job.attempts += 1;
        this.blockedUntil = Math.max(
          this.blockedUntil,
          Date.now() +
            (error.retryAfterMs ?? DEFAULT_RETRY_DELAY_MS) +
            Math.floor(Math.random() * 250),
        );
        this.pending.unshift(job);
        if (this.timer !== null) {
          clearTimeout(this.timer);
          this.timer = null;
        }
      } else {
        this.settle(job, "reject", error);
      }
    } finally {
      this.activeRequests -= 1;
      this.pump();
    }
  }

  private settle<T>(
    job: QueueJob<T>,
    outcome: "resolve" | "reject",
    value: T | unknown,
  ) {
    if (job.settled) {
      return;
    }

    job.settled = true;
    if (job.signal && job.onAbort) {
      job.signal.removeEventListener("abort", job.onAbort);
    }

    if (outcome === "resolve") {
      job.resolve(value as T);
    } else {
      job.reject(value);
    }
  }
}

const queues = new Map<string, FileContentRequestQueue>();

export const enqueueGitLabFileContentRequest = <T>(
  connectionKey: string,
  run: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> => {
  let queue = queues.get(connectionKey);
  if (!queue) {
    queue = new FileContentRequestQueue();
    queues.set(connectionKey, queue);
  }

  return queue.enqueue(run, signal);
};
