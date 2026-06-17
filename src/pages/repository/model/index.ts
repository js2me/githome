import { computed, reaction } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import type {
  GitLabProjectDC,
  GitLabProjectReadmeDC,
} from "@/shared/api/gitlab";
import { createGitlabQuery } from "@/shared/lib/gitlab/create-query";
import { VM } from "@/shared/lib/view-models/vm";
import { ProjectReadmeModel } from "./project-readme";
import type { RepositoryModelContext } from "./repository-model-context";

export class RepositoryPageVM extends VM implements RepositoryModelContext {
  projectQuery;
  readmeModel;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);

    this.projectQuery = createGitlabQuery<GitLabProjectDC>({
      globals,
      abortSignal: this.unmountSignal,
      params: () => ({
        path: `/projects/${this.projectId}`,
      }),
    });

    this.readmeModel = new ProjectReadmeModel({
      globals,
      abortSignal: this.unmountSignal,
      projectId: () => this.projectId,
      defaultBranch: () => this.projectQuery.data?.default_branch,
    });

    reaction(
      () => this.projectQuery.data,
      (project) => {
        if (project) {
          globals.stores.repository.setProject(project);
        }
      },
    );
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

  @computed
  get projectId(): number {
    const projectId = RepositoryPageVM.resolveProjectId(this.globals);
    if (projectId === null) {
      throw new Error("Project id is missing in route");
    }

    return projectId;
  }

  @computed
  get projectIdParam(): string {
    return String(this.projectId);
  }

  @computed
  get mergeRequestIid(): number | null {
    return RepositoryPageVM.resolveMergeRequestIid(this.globals);
  }

  @computed
  get selectedProject(): GitLabProjectDC | null {
    const fromQuery = this.projectQuery.data;
    if (fromQuery && fromQuery.id === this.projectId) {
      return fromQuery;
    }

    const cached = this.globals.stores.repository.project;
    if (!cached || cached.id !== this.projectId) {
      return null;
    }

    return cached;
  }

  @computed
  get isReadmeLoading() {
    return this.readmeModel.isLoading;
  }

  @computed
  get readmeErrorMessage() {
    return this.readmeModel.errorMessage;
  }

  @computed
  get project(): GitLabProjectDC | null {
    return this.projectQuery.data ?? this.selectedProject;
  }

  @computed
  get readme(): GitLabProjectReadmeDC | null {
    return this.readmeModel.readme;
  }

  @computed
  get isLoading() {
    return this.projectQuery.isLoading || this.projectQuery.isFetching;
  }

  @computed
  get errorMessage() {
    const error = this.projectQuery.error;
    if (!error) {
      return null;
    }

    return error instanceof Error ? error.message : "Не удалось загрузить репозиторий";
  }

  @computed
  get showReadmeMissing() {
    return (
      !this.isReadmeLoading &&
      !this.readmeErrorMessage &&
      this.readme === null
    );
  }
}
