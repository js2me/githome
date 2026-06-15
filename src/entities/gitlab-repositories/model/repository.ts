import { action, computed, makeObservable } from "mobx";
import type { SettingsStore } from "@/globals/stores/settings";
import type { GitLabProject } from "@/shared/api/gitlab";
import { appStorage } from "@/shared/lib/storage";

type ProjectsByConnection = Record<string, GitLabProject>;

export class Repository {
  private static readonly projectsByConnectionKey =
    appStorage.key<ProjectsByConnection>("selected-projects", {});

  constructor(private settings: SettingsStore) {
    makeObservable(this, {
      project: computed,
      setProject: action,
      clear: action,
    });
  }

  private get connectionId(): string | null {
    return this.settings.activeId;
  }

  /** Cached GitLab project info for the active connection. */
  get project(): GitLabProject | null {
    const connectionId = this.connectionId;
    if (!connectionId) {
      return null;
    }

    return Repository.projectsByConnectionKey.value[connectionId] ?? null;
  }

  setProject(project: GitLabProject) {
    const connectionId = this.connectionId;
    if (!connectionId) {
      return;
    }

    Repository.projectsByConnectionKey.value = {
      ...Repository.projectsByConnectionKey.value,
      [connectionId]: project,
    };
  }

  clear() {
    const connectionId = this.connectionId;
    if (!connectionId) {
      return;
    }

    const projects = { ...Repository.projectsByConnectionKey.value };
    delete projects[connectionId];
    Repository.projectsByConnectionKey.value = projects;
  }
}
