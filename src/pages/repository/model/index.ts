import { computed, makeObservable, observable, reaction } from "mobx";
import { createQuery } from "mobx-tanstack-query/preset";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { gitlabApi } from "@/shared/api/gitlab";
import type { GitLabProject, GitLabProjectReadme } from "@/shared/api/gitlab";
import { VM } from "@/shared/lib/view-models/vm";
import type { RepositoryModelContext } from "./repository-model-context";

type ProjectQuery = {
  data?: GitLabProject;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

type ReadmeQuery = {
  data?: GitLabProjectReadme | null;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
};

export class RepositoryVM extends VM implements RepositoryModelContext {
  projectQuery!: ProjectQuery;
  readmeQuery!: ReadmeQuery;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);

    this.projectQuery = createQuery({
      abortSignal: this.unmountSignal,
      queryKey: () =>
        [
          "gitlab",
          "project",
          globals.stores.settings.activeConnection?.id ?? null,
          this.projectId,
        ] as const,
      queryFn: ({ signal }) => {
        const connection = globals.stores.settings.activeConnection;
        if (!connection) {
          throw new Error("GitLab connection is not configured");
        }

        return gitlabApi.getProject(connection, this.projectId, signal);
      },
      options: () => ({
        enabled: !!globals.stores.settings.activeConnection,
      }),
    });

    this.readmeQuery = createQuery({
      abortSignal: this.unmountSignal,
      queryKey: () =>
        [
          "gitlab",
          "project-readme",
          globals.stores.settings.activeConnection?.id ?? null,
          this.projectId,
        ] as const,
      queryFn: ({ signal }) => {
        const connection = globals.stores.settings.activeConnection;
        if (!connection) {
          throw new Error("GitLab connection is not configured");
        }

        return gitlabApi.getProjectReadme(connection, this.projectId, {
          ref: this.projectQuery.data?.defaultBranch ?? null,
          signal,
        });
      },
      options: () => ({
        enabled:
          !!globals.stores.settings.activeConnection &&
          !!this.projectQuery.data,
      }),
    });

    reaction(
      () => this.projectQuery.data,
      (project) => {
        if (project) {
          globals.stores.repository.setProject(project);
        }
      },
    );

    makeObservable(this, {
      projectQuery: observable,
      readmeQuery: observable,
      projectId: computed,
      projectIdParam: computed,
      mergeRequestIid: computed,
      selectedProject: computed,
      project: computed,
      readme: computed,
      isLoading: computed,
      isReadmeLoading: computed,
      readmeErrorMessage: computed,
      errorMessage: computed,
    });
  }

  static resolveProjectId(globals: Globals): number | null {
    const { mergeRequest, mergeRequests, repository, repositoryRoot } =
      globals.router.routes;

    const projectId =
      mergeRequest.params?.projectId ??
      mergeRequests.params?.projectId ??
      repository.params?.projectId ??
      repositoryRoot.params?.projectId;

    if (!projectId) {
      return null;
    }

    const id = Number(projectId);
    return Number.isNaN(id) ? null : id;
  }

  static resolveMergeRequestIid(globals: Globals): number | null {
    const mergeRequestIid =
      globals.router.routes.mergeRequest.params?.mergeRequestIid;

    if (!mergeRequestIid) {
      return null;
    }

    const iid = Number(mergeRequestIid);
    return Number.isNaN(iid) ? null : iid;
  }

  get projectId(): number {
    const projectId = RepositoryVM.resolveProjectId(this.globals);
    if (projectId === null) {
      throw new Error("Project id is missing in route");
    }

    return projectId;
  }

  get projectIdParam(): string {
    return String(this.projectId);
  }

  get mergeRequestIid(): number | null {
    return RepositoryVM.resolveMergeRequestIid(this.globals);
  }

  get selectedProject(): GitLabProject | null {
    const cached = this.globals.stores.repository.project;
    if (!cached || cached.id !== this.projectId) {
      return null;
    }

    return cached;
  }

  get isReadmeLoading() {
    return this.readmeQuery.isLoading || this.readmeQuery.isFetching;
  }

  get readmeErrorMessage() {
    const error = this.readmeQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error ? error.message : "Не удалось загрузить README";
  }

  get project(): GitLabProject | null {
    return this.projectQuery.data ?? this.selectedProject;
  }

  get readme(): GitLabProjectReadme | null {
    return this.readmeQuery.data ?? null;
  }

  get isLoading() {
    return this.projectQuery.isLoading || this.projectQuery.isFetching;
  }

  get errorMessage() {
    const error = this.projectQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error ? error.message : "Не удалось загрузить репозиторий";
  }
}
