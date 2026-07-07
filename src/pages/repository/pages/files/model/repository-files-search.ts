import {
  action,
  computed,
  observable,
  reaction,
  runInAction,
} from "mobx";
import { gitlabApi } from "@/shared/api/gitlab";
import type {
  GitLabRepositoryTreeItemDC,
  GitLabSearchBlobDC,
} from "@/shared/api/gitlab";
import type { Globals } from "@/globals";
import { createGitlabApiQuery } from "@/shared/lib/gitlab/create-query";

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;
const MAX_FILE_RESULTS = 50;

export type FilesSearchMode = "files" | "content";

export interface FileSearchResult {
  path: string;
  name: string;
}

export interface RepositoryFilesSearchParams {
  globals: Globals;
  abortSignal: AbortSignal;
  projectId: () => number | null;
  ref: () => string | null | undefined;
  getLoadedFiles: () => GitLabRepositoryTreeItemDC[];
  onSelectFile: (path: string) => void;
}

export class RepositoryFilesSearchModel {
  filesSearchQuery;
  contentSearchQuery;

  @observable accessor searchQuery = "";
  @observable accessor debouncedQuery = "";
  @observable accessor searchMode: FilesSearchMode = "files";
  @observable accessor isOpen = false;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly params: RepositoryFilesSearchParams) {
    this.filesSearchQuery = createGitlabApiQuery<
      GitLabSearchBlobDC[],
      { projectId: number; ref: string; search: string }
    >({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => {
        const projectId = params.projectId();
        const ref = params.ref()?.trim();
        const search = this.debouncedQuery;

        if (
          projectId === null ||
          !ref ||
          search.length < MIN_QUERY_LENGTH ||
          this.searchMode !== "files"
        ) {
          return false;
        }

        return {
          projectId,
          ref,
          search: `filename:*${search}*`,
        };
      },
      queryKey: ({ connection, projectId, ref, search }) =>
        [
          "project-file-search",
          connection.gitlabUrl,
          projectId,
          ref,
          search,
        ] as const,
      queryFn: ({ connection, projectId, ref, search, signal }) =>
        gitlabApi.searchProjectBlobs(
          connection,
          projectId,
          search,
          ref,
          signal,
        ),
    });

    this.contentSearchQuery = createGitlabApiQuery<
      GitLabSearchBlobDC[],
      { projectId: number; ref: string; search: string }
    >({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => {
        const projectId = params.projectId();
        const ref = params.ref()?.trim();
        const search = this.debouncedQuery;

        if (
          projectId === null ||
          !ref ||
          search.length < MIN_QUERY_LENGTH ||
          this.searchMode !== "content"
        ) {
          return false;
        }

        return { projectId, ref, search };
      },
      queryKey: ({ connection, projectId, ref, search }) =>
        [
          "project-blob-search",
          connection.gitlabUrl,
          projectId,
          ref,
          search,
        ] as const,
      queryFn: ({ connection, projectId, ref, search, signal }) =>
        gitlabApi.searchProjectBlobs(
          connection,
          projectId,
          search,
          ref,
          signal,
        ),
    });

    reaction(
      () => this.searchQuery,
      (query) => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        const trimmed = query.trim();

        if (!trimmed) {
          runInAction(() => {
            this.debouncedQuery = "";
          });
          return;
        }

        this.debounceTimer = setTimeout(() => {
          runInAction(() => {
            this.debouncedQuery = trimmed;
          });
        }, SEARCH_DEBOUNCE_MS);
      },
    );
  }

  @computed
  get hasQuery() {
    return this.debouncedQuery.length >= MIN_QUERY_LENGTH;
  }

  @computed
  get localFileResults(): FileSearchResult[] {
    const query = this.debouncedQuery.toLowerCase();

    if (query.length < MIN_QUERY_LENGTH) {
      return [];
    }

    return this.params
      .getLoadedFiles()
      .filter(
        (item) =>
          item.path.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query),
      )
      .slice(0, MAX_FILE_RESULTS)
      .map((item) => ({ path: item.path, name: item.name }));
  }

  @computed
  get fileResults(): FileSearchResult[] {
    if (!this.hasQuery) {
      return [];
    }

    const apiResults = this.filesSearchQuery.data;

    if (apiResults && !this.filesSearchQuery.error) {
      return apiResults.slice(0, MAX_FILE_RESULTS).map((result) => ({
        path: result.path,
        name: result.basename || result.path.split("/").pop() || result.path,
      }));
    }

    return this.localFileResults;
  }

  @computed
  get contentResults() {
    return this.contentSearchQuery.data ?? [];
  }

  @computed
  get isFilesLoading() {
    return (
      this.searchMode === "files" &&
      this.hasQuery &&
      (this.filesSearchQuery.isLoading || this.filesSearchQuery.isFetching)
    );
  }

  @computed
  get isContentLoading() {
    return (
      this.searchMode === "content" &&
      this.hasQuery &&
      (this.contentSearchQuery.isLoading || this.contentSearchQuery.isFetching)
    );
  }

  @computed
  get isLoading() {
    return this.isFilesLoading || this.isContentLoading;
  }

  @computed
  get filesErrorMessage() {
    if (this.fileResults.length > 0) {
      return null;
    }

    const error = this.filesSearchQuery.error;
    if (!error) {
      return null;
    }

    if (error instanceof Error) {
      if (error.message.includes("403") || error.message.includes("404")) {
        return "Поиск по файлам недоступен на этом GitLab";
      }

      return error.message;
    }

    return "Не удалось выполнить поиск по файлам";
  }

  @computed
  get contentErrorMessage() {
    const error = this.contentSearchQuery.error;
    if (!error) {
      return null;
    }

    if (error instanceof Error) {
      if (error.message.includes("403") || error.message.includes("404")) {
        return "Поиск по содержимому недоступен на этом GitLab";
      }

      return error.message;
    }

    return "Не удалось выполнить поиск по содержимому";
  }

  @computed
  get errorMessage() {
    return this.searchMode === "files"
      ? this.filesErrorMessage
      : this.contentErrorMessage;
  }

  @computed
  get isPanelOpen() {
    return this.isOpen && this.searchQuery.trim().length > 0;
  }

  @computed
  get isQueryTooShort() {
    const trimmed = this.searchQuery.trim();
    return trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH;
  }

  @action.bound
  open() {
    this.isOpen = true;
  }

  @action.bound
  close() {
    this.isOpen = false;
  }

  @action.bound
  setSearchQuery(query: string) {
    this.searchQuery = query;
    if (query.trim()) {
      this.isOpen = true;
    }
  }

  @action.bound
  setSearchMode(mode: FilesSearchMode) {
    this.searchMode = mode;
  }

  @action.bound
  selectFile(path: string) {
    this.params.onSelectFile(path);
    this.searchQuery = "";
    this.debouncedQuery = "";
    this.isOpen = false;
  }

  @action.bound
  selectContentResult(result: GitLabSearchBlobDC) {
    this.selectFile(result.path);
  }
}
