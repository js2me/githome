import { actionBound, computed, observable, reaction } from 'mobx';
import {
  type GitLabMergeRequestChangeDC,
  gitlabApi,
} from '@/shared/api/gitlab';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { Globals } from '@/shared/model/globals';
import type { MrInfoModel, MrInfoModelParams } from '../../mr-info';
import {
  getFileReviewFingerprint,
  getReviewedFilePath,
} from './file-review-fingerprint';
import { ReviewSaveBatch } from './review-save-batch';
import {
  findReviewedFilesNote,
  readReviewedFiles,
} from './reviewed-files-note';

const createBatches = () =>
  observable.map<string, ReviewSaveBatch>(undefined, { deep: false });
const workspaceBatches = new WeakMap<
  Globals,
  ReturnType<typeof createBatches>
>();

export class ReviewedFiles {
  private readonly batches;

  constructor(
    private readonly info: MrInfoModel,
    private readonly options: MrInfoModelParams,
  ) {
    const { globals } = options;
    this.batches = workspaceBatches.get(globals) ?? createBatches();
    workspaceBatches.set(globals, this.batches);
    reaction(
      () => [this.serverNote, this.batch, this.batch?.note] as const,
      ([server, batch, pending]) => {
        if (
          server &&
          batch &&
          pending &&
          (server.id > pending.id ||
            (server.id === pending.id &&
              (server.body === pending.body ||
                server.updated_at > pending.updated_at)))
        ) {
          batch.note = undefined;
        }
      },
      { signal: options.abortSignal },
    );
  }

  @computed
  private get scope() {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    return connection && mr
      ? JSON.stringify([
          connection.id,
          connection.gitlabUrl,
          mr.project.id,
          mr.mergeRequestIid,
          this.info.currentUserId,
        ])
      : '';
  }

  @computed
  private get serverNote() {
    return findReviewedFilesNote(
      this.info.mergeRequestDiscussions ?? [],
      this.info.currentUserId,
    );
  }

  @computed
  private get batch() {
    return this.batches.get(this.scope);
  }

  @computed
  private get note() {
    return this.batch?.note ?? this.serverNote;
  }

  @computed
  get files() {
    const files = this.note && readReviewedFiles(this.note.body);
    return new Map((files || []).map((file) => [file.path, file]));
  }

  @computed
  get isReady() {
    const discussions = this.info.mergeRequestDiscussionsQuery;
    return Boolean(
      this.scope &&
        this.info.currentUserId !== null &&
        discussions.data &&
        !discussions.hasNextPage &&
        !discussions.error,
    );
  }

  pendingStatus(path: string, head: string, base: string | null) {
    const change = this.batch?.pending.get(path);
    return change?.head === head && change.base === base
      ? change.reviewed
      : undefined;
  }

  @computed
  get error() {
    const failure = this.batch?.failure;
    return failure ? { ...failure, message: failure.error.message } : null;
  }

  @actionBound
  fingerprint(
    change: GitLabMergeRequestChangeDC,
    head: string,
    base: string | null,
    signal: AbortSignal,
  ) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const sourceProjectId =
      this.info.mergeRequestDetail?.source_project_id ??
      (mr ? mr.project.id : undefined);
    return getFileReviewFingerprint(change, (side, path) => {
      const ref = side === 'old' ? base : head;
      if (!connection || !mr || !ref || !sourceProjectId) {
        throw new LocalizedError('review.fileVersionIsUnavailable');
      }

      return gitlabApi.getRepositoryFileBlobId(
        connection,
        side === 'old' ? mr.project.id : sourceProjectId,
        path,
        ref,
        signal,
      );
    });
  }

  @actionBound
  setReviewed(
    change: GitLabMergeRequestChangeDC,
    head: string,
    base: string | null,
    reviewed: boolean,
    knownFingerprint?: string,
  ) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const scope = this.scope;
    if (!connection || !mr || !head || !this.isReady) return;

    const path = getReviewedFilePath(change);
    const batch = this.batch ?? new ReviewSaveBatch();
    this.batches.set(scope, batch);
    const initialNote = this.note;
    // Accepted clicks should still save when the MR page is closed.
    const file = reviewed
      ? Promise.resolve(
          knownFingerprint ??
            this.fingerprint(change, head, base, new AbortController().signal),
        ).then((fingerprint) => ({ path, commit: head, fingerprint }))
      : Promise.resolve(null);
    batch.enqueue(
      path,
      {
        reviewed,
        head,
        base,
        file: file.then(
          (value) => ({ status: 'fulfilled', value }),
          (reason: unknown) => ({ status: 'rejected', reason }),
        ),
      },
      {
        readNote: () =>
          this.scope === scope ? this.note : (batch.note ?? initialNote),
        saveNote: (body, id) =>
          gitlabApi.saveMergeRequestNote(
            connection,
            mr.project.id,
            mr.mergeRequestIid,
            body,
            id,
          ),
        onSaved: () => {
          if (this.scope === scope) {
            void this.info.mergeRequestDiscussionsQuery
              .invalidate()
              .catch(() => undefined);
          }
        },
      },
    );
  }
}
