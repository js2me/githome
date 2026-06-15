import { action, computed, makeObservable, observable } from "mobx";
import { createQuery } from "mobx-tanstack-query/preset";
import type { Globals } from "@/globals";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabProject } from "@/shared/api/gitlab";

export interface GitlabProjectInfoParams {
  globals: Globals;
}

type ProjectsQuery = {
  data?: GitLabProject[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

export class GitlabProjectInfoModel {
  projectsQuery!: ProjectsQuery;

  constructor(private params: GitlabProjectInfoParams) {
    this.projectsQuery = createQuery({
      lazy: true,
      queryKey: () => {
        const connection = params.globals.stores.settings.activeConnection;
        return [
          "gitlab",
          "frequent-projects",
          connection?.id ?? null,
          connection?.gitlabUrl ?? null,
          connection?.gitToken ?? null,
        ] as const;
      },
      queryFn: ({ signal }) => {
        const connection = params.globals.stores.settings.activeConnection;
        if (!connection) {
          throw new Error("GitLab connection is not configured");
        }

        return gitlabApi.getFrequentProjects(connection, {
          limit: 10,
          signal,
        });
      },
      options: () => ({
        enabled: !!params.globals.stores.settings.activeConnection,
      }),
    });

    makeObservable(this, {
      projectsQuery: observable,
      projects: computed,
      isLoading: computed,
      errorMessage: computed,
      openProject: action,
    });
  }

  get projects(): GitLabProject[] {
    return this.projectsQuery.data ?? [];
  }

  get isLoading() {
    return this.projectsQuery.isLoading || this.projectsQuery.isFetching;
  }

  get errorMessage() {
    const error = this.projectsQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error ? error.message : "Не удалось загрузить проекты";
  }

  openProject(project: GitLabProject) {
    this.params.globals.stores.repository.setProject(project);
    void this.params.globals.router.routes.repository.open({
      projectId: String(project.id),
    });
  }
}
