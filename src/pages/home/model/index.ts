import { computed, makeObservable, observable } from "mobx";
import { createQuery } from "mobx-tanstack-query/preset";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabProject } from "@/shared/api/gitlab";
import { VM } from "@/shared/lib/view-models/vm";

export class HomeVM extends VM {
  projectsQuery!: {
    data?: GitLabProject[];
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
  };

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);

    this.projectsQuery = createQuery({
      abortSignal: this.unmountSignal,
      queryKey: () =>
        [
          "gitlab",
          "frequent-projects",
          this.connection?.id ?? null,
          this.connection?.gitlabUrl ?? null,
          this.connection?.gitToken ?? null,
        ] as const,
      queryFn: ({ signal }) => {
        const connection = this.connection;
        if (!connection) {
          throw new Error("GitLab connection is not configured");
        }

        return gitlabApi.getFrequentProjects(connection, {
          limit: 10,
          signal,
        });
      },
      options: () => ({
        enabled: !!this.connection,
      }),
    });

    makeObservable(this, {
      projectsQuery: observable,
      connection: computed,
      isConfigured: computed,
      connectionLabel: computed,
      projects: computed,
      isLoading: computed,
      errorMessage: computed,
    });
  }

  get projects(): GitLabProject[] {
    return (this.projectsQuery.data as GitLabProject[] | undefined) ?? [];
  }

  get connection() {
    return this.globals.stores.settings.activeConnection;
  }

  get isConfigured() {
    return this.globals.stores.settings.isConfigured;
  }

  get connectionLabel() {
    const connection = this.globals.stores.settings.activeItem;
    if (!connection) {
      return "";
    }

    return connection.gitlabUrl.trim();
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
}
