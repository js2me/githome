import { action, computed, observable, reaction, runInAction } from "mobx";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabRepositoryTreeItemDC } from "@/shared/api/gitlab";
import type { Globals } from "@/globals";
import { sortRepositoryTreeItems } from "../lib/repository-tree-utils";

export interface RepositoryTreeParams {
  globals: Globals;
  abortSignal: AbortSignal;
  projectId: () => number | null;
  ref: () => string | null | undefined;
}

export class RepositoryTreeModel {
  @observable.shallow accessor folderContents = new Map<
    string,
    GitLabRepositoryTreeItemDC[]
  >();
  @observable.shallow accessor expandedPaths = new Set<string>();
  @observable.shallow accessor loadingFolders = new Set<string>();
  @observable.shallow accessor folderErrors = new Map<string, string>();
  @observable accessor selectedFilePath: string | null = null;

  constructor(private readonly params: RepositoryTreeParams) {
    reaction(
      () => {
        const projectId = params.projectId();
        const ref = params.ref()?.trim();
        return projectId !== null && ref ? `${projectId}:${ref}` : null;
      },
      (key) => {
        if (!key) {
          return;
        }

        this.reset();
        void this.loadFolder("");
      },
      { fireImmediately: true },
    );
  }

  @computed
  get rootItems() {
    return this.getFolderItems("");
  }

  @computed
  get isRootLoading() {
    return this.loadingFolders.has("");
  }

  @computed
  get rootErrorMessage() {
    return this.folderErrors.get("") ?? null;
  }

  @computed
  get loadedBlobItems() {
    const blobs: GitLabRepositoryTreeItemDC[] = [];

    for (const items of this.folderContents.values()) {
      for (const item of items) {
        if (item.type === "blob") {
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
    return this.folderErrors.get(path) ?? null;
  }

  @action.bound
  reset() {
    this.folderContents.clear();
    this.expandedPaths.clear();
    this.loadingFolders.clear();
    this.folderErrors.clear();
  }

  @action.bound
  selectFile(path: string) {
    this.selectedFilePath = path;
  }

  @action.bound
  clearSelectedFile() {
    this.selectedFilePath = null;
  }

  @action.bound
  async revealFile(path: string) {
    this.selectedFilePath = path;

    const segments = path.split("/");
    let current = "";

    for (let index = 0; index < segments.length - 1; index += 1) {
      current = current ? `${current}/${segments[index]}` : segments[index];

      if (!this.expandedPaths.has(current)) {
        this.expandedPaths.add(current);
        await this.loadFolder(current);
      }
    }
  }

  @action.bound
  async toggleFolder(path: string) {
    if (this.expandedPaths.has(path)) {
      this.expandedPaths.delete(path);
      return;
    }

    this.expandedPaths.add(path);
    await this.loadFolder(path);
  }

  @action.bound
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
        this.folderContents.set(path, items);
      });
    } catch (error) {
      runInAction(() => {
        this.folderErrors.set(
          path,
          error instanceof Error
            ? error.message
            : "Не удалось загрузить содержимое папки",
        );
      });
    } finally {
      runInAction(() => {
        this.loadingFolders.delete(path);
      });
    }
  }
}
