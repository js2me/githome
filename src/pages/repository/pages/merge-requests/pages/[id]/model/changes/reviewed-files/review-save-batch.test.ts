import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitLabNoteDC } from '@/shared/api/gitlab';
import { ReviewSaveBatch } from './review-save-batch';
import { readReviewedFiles } from './reviewed-files-note';

const note = (body: string): GitLabNoteDC => ({
  id: 7,
  body,
  author: { id: 1 },
  created_at: '',
  updated_at: '',
});

function setup() {
  const batch = new ReviewSaveBatch();
  const saveNote = vi.fn(async (body: string, _id?: number) => note(body));
  const enqueue = (path: string, reviewed = true) => {
    batch.enqueue(
      path,
      {
        reviewed,
        head: 'head',
        base: null,
        file: Promise.resolve({
          status: 'fulfilled',
          value: reviewed
            ? { path, commit: 'head', fingerprint: 'a'.repeat(64) }
            : null,
        }),
      },
      { readNote: () => batch.note, saveNote, onSaved: () => undefined },
    );
  };
  return { batch, enqueue, saveNote };
}

describe('review save batch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('applies clicks immediately and saves the final status once per burst', async () => {
    const { batch, enqueue, saveNote } = setup();
    enqueue('a');
    enqueue('b');
    enqueue('a', false);
    expect(batch.pending.get('a')?.reviewed).toBe(false);
    expect(batch.pending.get('b')?.reviewed).toBe(true);
    expect(saveNote).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(saveNote).toHaveBeenCalledTimes(1);
    expect(
      readReviewedFiles(batch.note?.body ?? '')?.map(({ path }) => path),
    ).toEqual(['b']);
    expect(batch.pending.size).toBe(0);
  });

  it('queues changes during a write and updates the newly created note', async () => {
    const { batch, enqueue, saveNote } = setup();
    let finishWrite!: () => void;
    saveNote.mockImplementationOnce(
      (body) =>
        new Promise((resolve) => {
          finishWrite = () => resolve(note(body));
        }),
    );
    enqueue('a');
    await vi.runAllTimersAsync();
    enqueue('b');
    enqueue('a', false);
    expect(saveNote).toHaveBeenCalledTimes(1);
    finishWrite();
    await vi.runAllTimersAsync();

    expect(saveNote).toHaveBeenCalledTimes(2);
    expect(saveNote.mock.calls[1]?.[1]).toBe(7);
    expect(
      readReviewedFiles(batch.note?.body ?? '')?.map(({ path }) => path),
    ).toEqual(['b']);
  });

  it('rolls back a failed write without discarding newer changes', async () => {
    const { batch, enqueue, saveNote } = setup();
    let rejectWrite!: (error: Error) => void;
    saveNote.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectWrite = reject;
        }),
    );
    enqueue('a');
    await vi.runAllTimersAsync();
    enqueue('b');
    rejectWrite(new Error('offline'));
    await vi.runAllTimersAsync();

    expect(batch.failure?.error.message).toBe('offline');
    expect(batch.pending.size).toBe(0);
    expect(
      readReviewedFiles(batch.note?.body ?? '')?.map(({ path }) => path),
    ).toEqual(['b']);
  });
});
