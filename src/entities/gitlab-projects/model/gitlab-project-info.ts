import { action, computed } from "mobx";
import type { Globals } from "@/globals";
import type { GitLabProjectDC } from "@/shared/api/gitlab";
import { createGitlabQuery } from "@/shared/lib/gitlab/create-query";

export interface GitlabProjectInfoParams {
  globals: Globals;
  abortSignal: AbortSignal;
}

export class GitlabProjectInfoModel {
  projectsQuery;

  constructor(private params: GitlabProjectInfoParams) {
    this.projectsQuery = createGitlabQuery<GitLabProjectDC[]>({
      globals: params.globals,
      abortSignal: params.abortSignal,
      params: () => ({
        path: "/projects",
        query: {
          membership: true,
          order_by: "last_activity_at",
          sort: "desc",
          per_page: 10,
          simple: false,
        },
      }),
    });
  }

  @computed
  get projects(): GitLabProjectDC[] {
    return this.projectsQuery.data ?? [];
  }

  @computed
  get isLoading() {
    return this.projectsQuery.isLoading;
  }

  @computed
  get errorMessage() {
    const error = this.projectsQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error ? error.message : "Не удалось загрузить проекты";
  }

  @action.bound
  openProject(project: GitLabProjectDC) {
    this.params.globals.stores.repository.setProject(project);
    void this.params.globals.router.routes.repository.open({
      projectId: String(project.id),
    });
  }
}
