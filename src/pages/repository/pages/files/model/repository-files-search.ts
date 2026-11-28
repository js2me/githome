import { actionBound, computed, observable, reaction, runInAction } from 'mobx';
import type {
  GitLabRepositoryTreeItemDC,
  GitLabSearchBlobDC,
} from '@/shared/api/gitlab';
import {
  createProjectBlobSearchQuery,
  createProjectFileSearchQuery,
} from '@/shared/api/gitlab/queries/repository';
import { t } from '@/shared/lib/i18n';
import type { Globals } from '@/shared/model/globals';
import type { FileSearchTarget } from '../lib/file-find';

const SEARCH_DEBOUNCE_MS = 250;
const queryOptions = { staleTime: 30_000, retry: false };
const MIN_QUERY_LENGTH = 2;
const MAX_FILE_RESULTS = 50;

export type FilesSearchMode = 'files' | 'content';

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
  onSelectFile: (path: string, target?: FileSearchTarget) => void;
}

export class RepositoryFilesSearchModel {
  filesSearchQuery;
  contentSearchQuery;

  @observable accessor searchQuery = '';
  @observable accessor debouncedQuery = '';
  @observable accessor searchMode: FilesSearchMode = 'files';
  @observable accessor isOpen = false;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly params: RepositoryFilesSearchParams) {
    this.filesSearchQuery = createProjectFileSearchQuery({
      globals: params.globals,
      abortSignal: params.abortSignal,
      queryOptions,
      params: () => {
        const projectId = params.projectId();
        const ref = params.ref()?.trim();
        const search = this.remoteQuery;

        if (
          projectId === null ||
          !ref ||
          search.length < MIN_QUERY_LENGTH ||
          this.searchMode !== 'files'
        ) {
          return false;
        }

        return {
          projectId,
          ref,
          search: `filename:*${search}*`,
        };
      },
    });

    this.contentSearchQuery = createProjectBlobSearchQuery({
      globals: params.globals,
      abortSignal: params.abortSignal,
      queryOptions,
      params: () => {
        const projectId = params.projectId();
        const ref = params.ref()?.trim();
        const search = this.remoteQuery;

        if (
          projectId === null ||
          !ref ||
          search.length < MIN_QUERY_LENGTH ||
          this.searchMode !== 'content'
        ) {
          return false;
        }

        return { projectId, ref, search };
      },
    });

    reaction(
      () => this.searchQuery.trim(),
      (query) => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        if (query.length < MIN_QUERY_LENGTH) {
          this.debouncedQuery = '';
          return;
        }

        this.debounceTimer = setTimeout(() => {
          runInAction(() => {
            this.debouncedQuery = query;
          });
        }, SEARCH_DEBOUNCE_MS);
      },
      { signal: params.abortSignal },
    );
    params.abortSignal.addEventListener(
      'abort',
      () => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
      },
      { once: true },
    );
  }

  @computed
  get remoteQuery() {
    return this.isOpen && this.searchQuery.trim() === this.debouncedQuery
      ? this.debouncedQuery
      : '';
  }

  @computed
  get isDebouncing() {
    return (
      this.isPanelOpen &&
      !this.isQueryTooShort &&
      this.searchQuery.trim() !== this.debouncedQuery
    );
  }

  @computed
  get localFileResults(): FileSearchResult[] {
    const query = this.searchQuery.trim().toLowerCase();
    const results: FileSearchResult[] = [];
    if (query.length < MIN_QUERY_LENGTH) return results;

    for (const { path, name } of this.params.getLoadedFiles()) {
      if (path.toLowerCase().includes(query)) {
        results.push({ path, name });
        if (results.length === MAX_FILE_RESULTS) break;
      }
    }
    return results;
  }

  @computed
  get fileResults(): FileSearchResult[] {
    const results = new Map(
      this.localFileResults.map((file) => [file.path, file]),
    );

    if (this.remoteQuery) {
      for (const result of this.filesSearchQuery.data ?? []) {
        if (results.size >= MAX_FILE_RESULTS) break;
        results.set(result.path, {
          path: result.path,
          name: result.basename || result.path.split('/').pop() || result.path,
        });
      }
    }

    return [...results.values()];
  }

  @computed
  get contentResults() {
    return this.remoteQuery ? (this.contentSearchQuery.data ?? []) : [];
  }

  @computed
  get isFilesLoading() {
    return (
      this.searchMode === 'files' &&
      (this.isDebouncing ||
        (Boolean(this.remoteQuery) && this.filesSearchQuery.isFetching))
    );
  }

  @computed
  get isContentLoading() {
    return (
      this.searchMode === 'content' &&
      (this.isDebouncing ||
        (Boolean(this.remoteQuery) && this.contentSearchQuery.isFetching))
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
      if (error.message.includes('403') || error.message.includes('404')) {
        return t('files.fileSearchIsUnavailableOnThisGitlab');
      }

      return error.message;
    }

    return t('files.couldNotSearchForFiles');
  }

  @computed
  get contentErrorMessage() {
    const error = this.contentSearchQuery.error;
    if (!error) {
      return null;
    }

    if (error instanceof Error) {
      if (error.message.includes('403') || error.message.includes('404')) {
        return t('files.contentSearchIsUnavailableOnThisGitlab');
      }

      return error.message;
    }

    return t('files.couldNotSearchFileContents');
  }

  @computed
  get errorMessage() {
    return this.searchMode === 'files'
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

  @actionBound
  open() {
    this.isOpen = true;
  }

  @actionBound
  close() {
    this.isOpen = false;
  }

  @actionBound
  setSearchQuery(query: string) {
    this.searchQuery = query;
    if (query.trim()) {
      this.isOpen = true;
    }
  }

  @actionBound
  setSearchMode(mode: FilesSearchMode) {
    this.searchMode = mode;
  }

  @actionBound
  selectFile(path: string, target?: FileSearchTarget) {
    this.params.onSelectFile(path, target);
    this.searchQuery = '';
    this.debouncedQuery = '';
    this.isOpen = false;
  }

  @actionBound
  selectContentResult(result: GitLabSearchBlobDC) {
    this.selectFile(result.path, {
      query: this.remoteQuery,
      startLine: result.startline,
    });
  }
}
