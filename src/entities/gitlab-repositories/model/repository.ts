import { action, computed } from "mobx";
import type { SettingsStore } from "@/globals/stores/settings";
import type { GitLabProjectDC } from "@/shared/api/gitlab";
import { appStorage } from "@/shared/lib/storage";

type ProjectsByConnection = Record<string, GitLabProjectDC>;

export class Repository {
  private static readonly projectsByConnectionKey =
    appStorage.key<ProjectsByConnection>("selected-projects", {});

  constructor(private settings: SettingsStore) {}

  private get connectionId(): string | null {
    return this.settings.activeId;
  }

  /** Cached GitLab project info for the active connection. */
  @computed
  get project(): GitLabProjectDC | null {
    const connectionId = this.connectionId;
    if (!connectionId) {
      return null;
    }

    return Repository.projectsByConnectionKey.value[connectionId] ?? null;
  }

  @action
  setProject(project: GitLabProjectDC) {
    const connectionId = this.connectionId;
    if (!connectionId) {
      return;
    }

    Repository.projectsByConnectionKey.value = {
      ...Repository.projectsByConnectionKey.value,
      [connectionId]: project,
    };
  }

  @action
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
