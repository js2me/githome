import { computed } from "mobx";
import type { Globals } from "@/globals";
import type { GitLabProjectDC } from "@/shared/api/gitlab";
import { createGitlabQuery } from "@/shared/lib/gitlab/create-query";
import { GitlabProjectInfo } from "./gitlab-project-info";

export interface GitlabProjectsListParams {
  globals: Globals;
  abortSignal: AbortSignal;
}

export class GitlabProjectsList {
  projectsQuery;

  constructor(params: GitlabProjectsListParams) {
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
  get projects(): GitlabProjectInfo[] {
    return (this.projectsQuery.data ?? []).map(
      (data) => new GitlabProjectInfo(data),
    );
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
}
