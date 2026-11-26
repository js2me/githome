import { actionBound, observable, observableRef, runInAction } from 'mobx';
import type { GitLabNoteDC } from '@/shared/api/gitlab';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import {
  formatReviewedFiles,
  readReviewedFiles,
  type ReviewedFile,
} from './reviewed-files-note';

const BATCH_WINDOW_MS = 300;

type ReviewChange = {
  reviewed: boolean;
  head: string;
  base: string | null;
  file: Promise<PromiseSettledResult<ReviewedFile | null>>;
};

type SaveContext = {
  readNote: () => GitLabNoteDC | undefined;
  saveNote: (body: string, id?: number) => Promise<GitLabNoteDC>;
  onSaved: () => void;
};

export class ReviewSaveBatch {
  readonly pending = observable.map<string, ReviewChange>(undefined, {
    deep: false,
  });
  @observableRef accessor note: GitLabNoteDC | undefined = undefined;
  @observableRef accessor failure: { path: string; error: Error } | null =
    null;

  private queued = new Map<string, ReviewChange>();
  private context?: SaveContext;
  private timer?: ReturnType<typeof setTimeout>;
  private writing = false;

  @actionBound
  enqueue(path: string, change: ReviewChange, context: SaveContext) {
    this.pending.set(path, change);
    this.queued.set(path, change);
    this.context = context;
    this.failure = null;
    if (this.timer === undefined && !this.writing) {
      this.timer = setTimeout(this.flush, BATCH_WINDOW_MS);
    }
  }

  @actionBound
  async flush() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.writing || !this.context || !this.queued.size) return;

    const context = this.context;
    const changes = this.queued;
    this.context = undefined;
    this.queued = new Map();
    this.writing = true;

    const complete = new Map<string, ReviewChange>();
    try {
      const prepared = await Promise.all(
        Array.from(changes, async ([path, change]) => ({
          path,
          change,
          result: await change.file,
        })),
      );
      const note = context.readNote();
      const savedFiles = (note && readReviewedFiles(note.body)) || [];
      const files = new Map(savedFiles.map((file) => [file.path, file]));
      for (const { path, change, result } of prepared) {
        if (this.pending.get(path) !== change) continue;
        if (result.status === 'rejected') {
          runInAction(() => this.finish(path, change, result.reason));
          continue;
        }
        complete.set(path, change);
        if (result.value) {
          files.set(path, result.value);
        } else {
          files.delete(path);
        }
      }

      const body = formatReviewedFiles(files.values());
      const saved =
        body !== formatReviewedFiles(savedFiles)
          ? await context.saveNote(body, note?.id)
          : undefined;
      runInAction(() => {
        if (saved) this.note = saved;
        for (const [path, change] of complete) this.finish(path, change);
      });
      if (saved) context.onSaved();
    } catch (error) {
      runInAction(() => {
        for (const [path, change] of changes) this.finish(path, change, error);
      });
    } finally {
      this.writing = false;
      if (this.queued.size) void this.flush();
    }
  }

  private finish(path: string, change: ReviewChange, error?: unknown) {
    if (this.pending.get(path) !== change) return;
    this.pending.delete(path);
    if (error !== undefined) {
      this.failure = {
        path,
        error:
          error instanceof Error
            ? error
            : new LocalizedError('review.couldNotSaveTheViewedStatus'),
      };
    }
  }
}
