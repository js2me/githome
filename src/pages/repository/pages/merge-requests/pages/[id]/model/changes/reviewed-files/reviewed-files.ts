import {
  actionBound,
  computed,
  observableRef,
  reaction,
  runInAction,
} from 'mobx';
import {
  type GitLabMergeRequestChangeDC,
  type GitLabNoteDC,
  gitlabApi,
} from '@/shared/api/gitlab';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { MrInfoModel, MrInfoModelParams } from '../../mr-info';
import {
  getFileReviewFingerprint,
  getReviewedFilePath,
} from './file-review-fingerprint';
import {
  findReviewedFilesNote,
  formatReviewedFiles,
  readReviewedFiles,
} from './reviewed-files-note';

export class ReviewedFiles {
  @observableRef private accessor pendingNote: {
    scope: string;
    note: GitLabNoteDC;
  } | null = null;
  @observableRef private accessor saving: {
    scope: string;
    path: string;
  } | null = null;
  @observableRef private accessor failure: {
    scope: string;
    path: string;
    error: Error;
  } | null = null;

  constructor(
    private readonly info: MrInfoModel,
    private readonly options: MrInfoModelParams,
  ) {
    reaction(
      () => [this.serverNote, this.pendingNote] as const,
      ([server, pending]) => {
        if (
          server &&
          pending?.scope === this.scope &&
          (server.id > pending.note.id ||
            (server.id === pending.note.id &&
              (server.body === pending.note.body ||
                server.updated_at > pending.note.updated_at)))
        ) {
          this.pendingNote = null;
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
  private get note() {
    return this.pendingNote?.scope === this.scope
      ? this.pendingNote.note
      : this.serverNote;
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

  @computed
  get savingPath() {
    return this.saving?.scope === this.scope ? this.saving.path : null;
  }

  @computed
  get error() {
    const failure = this.failure;
    return failure?.scope === this.scope
      ? { ...failure, message: failure.error.message }
      : null;
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
  async toggle(
    change: GitLabMergeRequestChangeDC,
    head: string,
    base: string | null,
    knownFingerprint?: string,
  ) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const scope = this.scope;
    const signal = this.options.abortSignal;
    if (
      !connection ||
      !mr ||
      !head ||
      !this.isReady ||
      this.savingPath !== null
    ) {
      return;
    }

    const path = getReviewedFilePath(change);
    const saving = { scope, path };
    this.saving = saving;
    this.failure = null;
    try {
      const fingerprint =
        knownFingerprint ??
        (await this.fingerprint(change, head, base, signal));
      if (this.scope !== scope || signal.aborted) {
        return;
      }

      const files = new Map(this.files);
      if (files.get(path)?.fingerprint === fingerprint) {
        files.delete(path);
      } else {
        files.set(path, { path, commit: head, fingerprint });
      }

      const body = formatReviewedFiles(files.values());
      const note = await gitlabApi.saveMergeRequestNote(
        connection,
        mr.project.id,
        mr.mergeRequestIid,
        body,
        this.note?.id,
        signal,
      );
      if (this.scope === scope && !signal.aborted) {
        runInAction(() => {
          this.pendingNote = { scope, note };
        });
        void this.info.mergeRequestDiscussionsQuery
          .invalidate()
          .catch(() => undefined);
      }
    } catch (error) {
      if (!signal.aborted && this.scope === scope) {
        runInAction(() => {
          this.failure = {
            scope,
            path,
            error:
              error instanceof Error
                ? error
                : new LocalizedError('review.couldNotSaveTheViewedStatus'),
          };
        });
      }
    } finally {
      runInAction(() => {
        if (this.saving === saving) {
          this.saving = null;
        }
      });
    }
  }
}
