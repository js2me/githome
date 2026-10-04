import { action, computed, observable, reaction } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabBranchDC } from "@/shared/api/gitlab";
import type { Globals } from "@/globals";
import { RepositoryPageVM } from "@/pages/repository/model/page-vm";
import { createGitlabApiQuery } from "@/shared/lib/gitlab/create-query";
import { VM } from "@/shared/lib/view-models/vm";
import { isMarkdownPath } from "../lib/repository-tree-utils";
import { FilesPageQuerySync, type FilesQueryData } from "./files-page-query-sync";
import { RepositoryCommitsModel } from "./repository-commits";
import { RepositoryFilesSearchModel } from "./repository-files-search";
import { RepositoryTreeModel } from "./repository-tree";

export class FilesPageVM extends VM<{}, RepositoryPageVM> {
  treeModel;
  commitsModel;
  searchModel;
  fileContentQuery;
  branchesQuery;
  querySync;

  @observable accessor selectedBranch: string | null = null;
  @observable accessor isBranchPickerOpen = false;
  @observable accessor isCommitPickerOpen = false;

  private lastProjectId: number | null = null;

  constructor(globals: Globals, params: ViewModelParams<{}, RepositoryPageVM>) {
    super(globals, params);

    this.commitsModel = new RepositoryCommitsModel({
      globals,
      abortSignal: this.unmountSignal,
      projectId: () => this.projectId,
      branchRef: () => this.branchRef,
    });

    this.treeModel = new RepositoryTreeModel({
      globals,
      abortSignal: this.unmountSignal,
      projectId: () => this.projectId,
      ref: () => this.ref,
    });

    this.searchModel = new RepositoryFilesSearchModel({
      globals,
      abortSignal: this.unmountSignal,
      projectId: () => this.projectId,
      ref: () => this.ref,
      getLoadedFiles: () => this.treeModel.loadedBlobItems,
      onSelectFile: (path) => {
        void this.treeModel.revealFile(path);
      },
    });

    this.branchesQuery = createGitlabApiQuery<
      GitLabBranchDC[],
      { projectId: number }
    >({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const projectId = this.projectId;
        if (projectId === null) {
          return false;
        }

        return { projectId };
      },
      queryKey: ({ connection, projectId }) =>
        ["project-branches", connection.gitlabUrl, projectId] as const,
      queryFn: ({ connection, projectId, signal }) =>
        gitlabApi.getProjectBranches(connection, projectId, signal),
    });

    this.fileContentQuery = createGitlabApiQuery<
      string,
      { projectId: number; ref: string; filePath: string }
    >({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const projectId = this.projectId;
        const ref = this.ref;
        const filePath = this.treeModel.selectedFilePath;

        if (projectId === null || !ref || !filePath) {
          return false;
        }

        return { projectId, ref, filePath };
      },
      queryKey: ({ connection, projectId, ref, filePath }) =>
        [
          "repository-file-content",
          connection.gitlabUrl,
          projectId,
          ref,
          filePath,
        ] as const,
      queryFn: ({ connection, projectId, ref, filePath, signal }) =>
        gitlabApi.getRepositoryFileContent(
          connection,
          projectId,
          filePath,
          ref,
          signal,
        ),
    });

    this.querySync = new FilesPageQuerySync(
      globals,
      () => ({
        branch: this.branchRef,
        commit: this.commitsModel.selectedCommitSha,
        file: this.treeModel.selectedFilePath,
      }),
      (data) => this.applyQueryState(data),
    );

    reaction(
      () => this.projectId,
      (projectId) => {
        if (projectId === this.lastProjectId) {
          return;
        }

        this.lastProjectId = projectId;
        this.isBranchPickerOpen = false;
        this.isCommitPickerOpen = false;
        this.searchModel.close();
        this.searchModel.setSearchQuery("");
      },
      { fireImmediately: true },
    );
  }

  @action.bound
  applyQueryState(data: FilesQueryData) {
    const branch = data.branch || this.defaultBranch;

    if (branch && branch !== this.selectedBranch) {
      this.selectedBranch = branch;
    } else if (!this.selectedBranch && branch) {
      this.selectedBranch = branch;
    }

    if (data.commit !== this.commitsModel.selectedCommitSha) {
      this.commitsModel.selectedCommitSha = data.commit;
    }

    if (data.file) {
      if (data.file !== this.treeModel.selectedFilePath) {
        this.treeModel.selectFile(data.file);
      }
      return;
    }

    if (this.treeModel.selectedFilePath !== null) {
      this.treeModel.clearSelectedFile();
    }
  }

  @computed
  get projectId() {
    return this.parentViewModel.projectId;
  }

  @computed
  get project() {
    return this.parentViewModel.project;
  }

  @computed
  get defaultBranch() {
    return this.project?.default_branch?.trim() ?? null;
  }

  @computed
  get branchRef() {
    return this.selectedBranch ?? this.defaultBranch;
  }

  @computed
  get ref() {
    return this.commitsModel.ref;
  }

  @computed
  get connection() {
    return this.globals.stores.settings.activeConnection;
  }

  @computed
  get projectPath() {
    return this.project?.path_with_namespace ?? "";
  }

  @computed
  get selectedFilePath() {
    return this.treeModel.selectedFilePath;
  }

  @computed
  get isBranchesLoading() {
    return this.branchesQuery.isLoading || this.branchesQuery.isFetching;
  }

  @computed
  get branchesErrorMessage() {
    const error = this.branchesQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : "Не удалось загрузить ветки";
  }

  @computed
  get branchOptions() {
    const branches = this.branchesQuery.data ?? [];

    return [...branches].sort((left, right) => {
      if (left.default !== right.default) {
        return left.default ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }

  @computed
  get isFileContentLoading() {
    return this.fileContentQuery.isLoading || this.fileContentQuery.isFetching;
  }

  @computed
  get fileContentErrorMessage() {
    const error = this.fileContentQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error
      ? error.message
      : "Не удалось загрузить содержимое файла";
  }

  @computed
  get fileContent() {
    return this.fileContentQuery.data ?? null;
  }

  @computed
  get isMarkdownFile() {
    const path = this.selectedFilePath;
    return path ? isMarkdownPath(path) : false;
  }

  @computed
  get selectedFileName() {
    const path = this.selectedFilePath;
    if (!path) {
      return null;
    }

    return path.split("/").pop() ?? path;
  }

  @action.bound
  toggleBranchPicker() {
    this.isBranchPickerOpen = !this.isBranchPickerOpen;
    if (this.isBranchPickerOpen) {
      this.isCommitPickerOpen = false;
    }
  }

  @action.bound
  closeBranchPicker() {
    this.isBranchPickerOpen = false;
  }

  @action.bound
  selectBranch(branch: string) {
    this.selectedBranch = branch;
    this.isBranchPickerOpen = false;
    this.isCommitPickerOpen = false;
    this.commitsModel.reset();
  }

  @action.bound
  toggleCommitPicker() {
    this.isCommitPickerOpen = !this.isCommitPickerOpen;
    if (this.isCommitPickerOpen) {
      this.isBranchPickerOpen = false;
    }
  }

  @action.bound
  closeCommitPicker() {
    this.isCommitPickerOpen = false;
  }
}
