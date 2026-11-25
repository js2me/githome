import { actionBound, computed, observableRef, reaction } from 'mobx';
import type {
  GitLabMergeRequestChangeDC,
  GitLabMergeRequestDC,
  GitLabMergeRequestVersionDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab';
import { gitlabApi } from '@/shared/api/gitlab';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/create-query';
import type { Globals } from '@/shared/model/globals';

export type MergeRequestGitDiffContext = {
  project: GitLabProjectDC;
  mergeRequestIid: number;
};

export interface MergeRequestGitDiffParams {
  globals: Globals;
  readonly abortSignal: AbortSignal;
  readonly params: () => MergeRequestGitDiffContext | false;
  readonly getMergeRequestDetail: () => GitLabMergeRequestDC | null;
}

export class MergeRequestGitDiff {
  changesQuery;
  versionsQuery;

  @observableRef private accessor selection: {
    scope: string;
    version: GitLabMergeRequestVersionDC;
  } | null = null;

  constructor(private readonly options: MergeRequestGitDiffParams) {
    this.changesQuery = createGitlabApiQuery<
      GitLabMergeRequestChangeDC[],
      MergeRequestGitDiffContext & {
        revision: string;
        version: GitLabMergeRequestVersionDC | null;
        detail: GitLabMergeRequestDC | null;
      }
    >({
      globals: options.globals,
      abortSignal: options.abortSignal,
      queryOptions: { retry: 1 },
      params: () => {
        const mr = options.params();
        const version = this.selectedVersion;
        const revision = this.revision;
        if (!mr || !revision) {
          return false;
        }

        return {
          ...mr,
          revision,
          version,
          detail: version ? null : options.getMergeRequestDetail(),
        };
      },
      queryKey: ({ revision }) => ['merge-request-changes', revision],
      queryFn: ({
        connection,
        project,
        mergeRequestIid,
        version,
        detail,
        signal,
      }) =>
        gitlabApi.getMergeRequestChanges(
          connection,
          project,
          mergeRequestIid,
          version?.id ?? null,
          version,
          signal,
          detail ?? undefined,
        ),
    });

    this.versionsQuery = createGitlabApiQuery<
      GitLabMergeRequestVersionDC[],
      MergeRequestGitDiffContext & { revision: string; scope: string }
    >({
      globals: options.globals,
      abortSignal: options.abortSignal,
      queryOptions: {
        retry: 1,
        placeholderData: (previousVersions, previousQuery) =>
          previousQuery?.queryKey[1] === this.scope
            ? previousVersions
            : undefined,
      },
      params: () => {
        const mr = options.params();
        const scope = this.scope;
        const revision = this.latestRevision;
        return mr && scope && revision ? { ...mr, revision, scope } : false;
      },
      queryKey: ({ scope, revision }) => [
        'merge-request-versions',
        scope,
        revision,
      ],
      queryFn: ({ connection, project, mergeRequestIid, signal }) =>
        gitlabApi.getMergeRequestVersions(
          connection,
          project,
          mergeRequestIid,
          signal,
        ),
    });

    reaction(
      () => this.scope,
      () => {
        this.selection = null;
      },
      { signal: options.abortSignal },
    );
  }

  @computed
  private get scope(): string {
    const mr = this.options.params();
    const connection = this.options.globals.stores.settings.activeConnection;
    return mr && connection
      ? JSON.stringify([
          connection.id,
          connection.gitlabUrl,
          mr.project.id,
          mr.mergeRequestIid,
        ])
      : '';
  }

  @computed
  private get latestRevision(): string {
    const detail = this.options.getMergeRequestDetail();
    if (!detail) {
      return '';
    }

    const refs = detail.diff_refs;
    return refs?.head_sha
      ? JSON.stringify([refs.base_sha, refs.start_sha, refs.head_sha])
      : detail.updated_at;
  }

  @computed
  get revision(): string {
    const version = this.selectedVersion;
    const latest = version ? '' : this.latestRevision;
    return this.scope && (version || latest)
      ? JSON.stringify([
          this.scope,
          version ? ['version', version.id] : ['latest', latest],
        ])
      : '';
  }

  @computed
  get changes(): GitLabMergeRequestChangeDC[] | null {
    return this.changesQuery.data ?? null;
  }

  @computed
  get versions(): GitLabMergeRequestVersionDC[] {
    return this.versionsQuery.data ?? [];
  }

  @computed
  get selectedVersion(): GitLabMergeRequestVersionDC | null {
    return this.selection?.scope === this.scope ? this.selection.version : null;
  }

  @computed
  get selectedVersionId(): number | null {
    return this.selectedVersion?.id ?? null;
  }

  @computed
  get isLoading() {
    return (
      this.changes === null &&
      (this.changesQuery.isPending || this.changesQuery.isFetching)
    );
  }

  @computed
  get errorMessage() {
    const error = this.changesQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : 'Не удалось загрузить изменения';
  }

  @actionBound
  selectVersion(id: number | null) {
    const version =
      id === null ? null : this.versions.find((item) => item.id === id);
    this.selection = version ? { scope: this.scope, version } : null;
  }

  @actionBound
  async loadFileContent(filePath: string, ref: string) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      throw new Error('Repository is not selected');
    }

    return gitlabApi.getRepositoryFileContent(
      connection,
      mr.project.id,
      filePath,
      ref,
      this.options.abortSignal,
    );
  }

  @actionBound
  async loadFileImage(filePath: string, ref: string, signal: AbortSignal) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      throw new Error('Repository is not selected');
    }

    return gitlabApi.getRepositoryFileImage(
      connection,
      mr.project.id,
      filePath,
      ref,
      AbortSignal.any([signal, this.options.abortSignal]),
    );
  }

  invalidate() {
    return Promise.all([
      this.changesQuery.invalidate(),
      this.versionsQuery.invalidate(),
    ]);
  }
}
