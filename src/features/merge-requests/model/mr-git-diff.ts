import { action, computed, observable, reaction, runInAction } from "mobx";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  GitLabMergeRequestChangeDC,
  GitLabMergeRequestVersionDC,
  GitLabProjectDC,
} from "@/shared/api/gitlab";
import { createGitlabApiQuery } from "@/shared/lib/gitlab/create-query";
import type { Globals } from "@/globals";

export type MergeRequestGitDiffContext = {
  project: GitLabProjectDC;
  mergeRequestIid: number;
};

export interface MergeRequestGitDiffParams {
  globals: Globals;
  readonly abortSignal: AbortSignal;
  readonly params: () => MergeRequestGitDiffContext | false;
}

export class MergeRequestGitDiff {
  changesQuery;
  versionsQuery;

  @observable accessor selectedVersionId: number | null = null;

  constructor(private readonly options: MergeRequestGitDiffParams) {
    this.changesQuery = createGitlabApiQuery<
      GitLabMergeRequestChangeDC[],
      MergeRequestGitDiffContext & {
        versionId: number | null;
        version: GitLabMergeRequestVersionDC | null;
      }
    >({
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: () => {
        const mr = options.params();
        if (!mr) {
          return false;
        }

        return {
          ...mr,
          versionId: this.selectedVersionId,
          version: this.selectedVersion,
        };
      },
      queryKey: ({ connection, project, mergeRequestIid, versionId }) =>
        [
          "merge-request-changes",
          "compare",
          connection.gitlabUrl,
          project.id,
          mergeRequestIid,
          versionId ?? "latest",
        ] as const,
      queryFn: ({ connection, project, mergeRequestIid, versionId, version, signal }) =>
        gitlabApi.getMergeRequestChanges(
          connection,
          project,
          mergeRequestIid,
          versionId,
          version,
          signal,
        ),
    });

    this.versionsQuery = createGitlabApiQuery<
      GitLabMergeRequestVersionDC[],
      MergeRequestGitDiffContext
    >({
      globals: options.globals,
      abortSignal: options.abortSignal,
      params: () => options.params(),
      queryKey: ({ connection, project, mergeRequestIid }) =>
        [
          "merge-request-versions",
          connection.gitlabUrl,
          project.id,
          mergeRequestIid,
        ] as const,
      queryFn: async ({ connection, project, mergeRequestIid, signal }) => {
        try {
          return await gitlabApi.getMergeRequestVersions(
            connection,
            project,
            mergeRequestIid,
            signal,
          );
        } catch {
          return [] as GitLabMergeRequestVersionDC[];
        }
      },
    });

    reaction(
      () => {
        const mr = options.params();
        return mr ? `${mr.project.id}:${mr.mergeRequestIid}` : "";
      },
      () => {
        runInAction(() => {
          this.selectedVersionId = null;
        });
      },
    );
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
    if (this.selectedVersionId === null) {
      return null;
    }

    return this.versions.find((v) => v.id === this.selectedVersionId) ?? null;
  }

  @computed
  get isLoading() {
    return this.changesQuery.isLoading || this.changesQuery.isFetching;
  }

  @computed
  get isReady() {
    return this.changes !== null || this.changesQuery.isError;
  }

  @computed
  get errorMessage() {
    const error = this.changesQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : "Не удалось загрузить изменения";
  }

  @action.bound
  selectVersion(id: number | null) {
    this.selectedVersionId = id;
  }

  @action.bound
  async loadFileContent(filePath: string, ref: string) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();

    if (!connection || !mr) {
      throw new Error("Repository is not selected");
    }

    return gitlabApi.getRepositoryFileContent(
      connection,
      mr.project.id,
      filePath,
      ref,
      this.options.abortSignal,
    );
  }

  async invalidate() {
    await Promise.all([
      this.changesQuery.refetch(),
      this.versionsQuery.refetch(),
    ]);
  }
}
