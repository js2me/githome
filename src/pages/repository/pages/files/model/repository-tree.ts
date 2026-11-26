import {
  actionBound,
  computed,
  observable,
  observableShallow,
  reaction,
  runInAction,
} from 'mobx';
import type { GitLabRepositoryTreeItemDC } from '@/shared/api/gitlab';
import { gitlabApi } from '@/shared/api/gitlab';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { Globals } from '@/shared/model/globals';
import { sortRepositoryTreeItems } from '../lib/repository-tree-utils';

export interface RepositoryTreeParams {
  globals: Globals;
  abortSignal: AbortSignal;
  projectId: () => number | null;
  ref: () => string | null | undefined;
}

export class RepositoryTreeModel {
  @observableShallow accessor folderContents = new Map<
    string,
    GitLabRepositoryTreeItemDC[]
  >();
  @observableShallow accessor expandedPaths = new Set<string>();
  @observableShallow accessor loadingFolders = new Set<string>();
  @observableShallow accessor folderErrors = new Map<string, Error>();
  @observable accessor selectedFilePath: string | null = null;

  private revision = 0;

  constructor(private readonly params: RepositoryTreeParams) {
    reaction(
      () => ({
        projectId: params.projectId(),
        ref: params.ref()?.trim(),
        connection: params.globals.stores.settings.activeConnection,
        filePath: this.selectedFilePath,
      }),
      ({ projectId, ref, connection, filePath }, previous) => {
        const repositoryChanged =
          !previous ||
          previous.projectId !== projectId ||
          previous.ref !== ref ||
          previous.connection !== connection;

        if (repositoryChanged) {
          this.reset();
        }

        if (projectId === null || !ref || !connection) {
          return;
        }

        if (repositoryChanged) {
          void this.loadFolder('');
        }

        if (filePath && (repositoryChanged || previous.filePath !== filePath)) {
          this.expandFilePath(filePath);
        }
      },
      { fireImmediately: true, signal: params.abortSignal },
    );
  }

  @computed
  get rootItems() {
    return this.getFolderItems('');
  }

  @computed
  get isRootLoading() {
    return this.loadingFolders.has('');
  }

  @computed
  get rootErrorMessage() {
    return this.folderErrors.get('')?.message ?? null;
  }

  @computed
  get loadedBlobItems() {
    const blobs: GitLabRepositoryTreeItemDC[] = [];

    for (const items of this.folderContents.values()) {
      for (const item of items) {
        if (item.type === 'blob') {
          blobs.push(item);
        }
      }
    }

    return blobs;
  }

  getFolderItems(path: string) {
    const items = this.folderContents.get(path);
    return items ? sortRepositoryTreeItems(items) : [];
  }

  isFolderExpanded(path: string) {
    return this.expandedPaths.has(path);
  }

  isFolderLoading(path: string) {
    return this.loadingFolders.has(path);
  }

  getFolderError(path: string) {
    return this.folderErrors.get(path)?.message ?? null;
  }

  @actionBound
  private reset() {
    this.revision += 1;
    this.folderContents.clear();
    this.expandedPaths.clear();
    this.loadingFolders.clear();
    this.folderErrors.clear();
  }

  @actionBound
  selectFile(path: string) {
    if (this.selectedFilePath === path) {
      this.expandFilePath(path);
      return;
    }

    this.selectedFilePath = path;
  }

  @actionBound
  clearSelectedFile() {
    this.selectedFilePath = null;
  }

  private expandFilePath(path: string) {
    const segments = path.split('/');
    let current = '';

    for (let index = 0; index < segments.length - 1; index += 1) {
      current = current ? `${current}/${segments[index]}` : segments[index];

      this.expandedPaths.add(current);
      void this.loadFolder(current);
    }
  }

  @actionBound
  async toggleFolder(path: string) {
    if (this.expandedPaths.has(path)) {
      this.expandedPaths.delete(path);
      return;
    }

    this.expandedPaths.add(path);
    await this.loadFolder(path);
  }

  @actionBound
  async loadFolder(path: string) {
    if (this.folderContents.has(path) || this.loadingFolders.has(path)) {
      return;
    }

    const projectId = this.params.projectId();
    const ref = this.params.ref()?.trim();
    const connection = this.params.globals.stores.settings.activeConnection;

    if (projectId === null || !ref || !connection) {
      return;
    }

    const revision = this.revision;
    this.loadingFolders.add(path);
    this.folderErrors.delete(path);

    try {
      const items = await gitlabApi.getRepositoryTree(
        connection,
        projectId,
        ref,
        path || undefined,
        this.params.abortSignal,
      );

      runInAction(() => {
        if (revision === this.revision) {
          this.folderContents.set(path, items);
        }
      });
    } catch (error) {
      runInAction(() => {
        if (revision !== this.revision) return;

        this.folderErrors.set(
          path,
          error instanceof Error
            ? error
            : new LocalizedError('files.couldNotLoadTheFolderContents'),
        );
      });
    } finally {
      runInAction(() => {
        if (revision === this.revision) {
          this.loadingFolders.delete(path);
        }
      });
    }
  }
}
