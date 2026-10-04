import { action, computed, reaction } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import type {
  GitLabProjectDC,
  GitLabProjectReadmeDC,
} from "@/shared/api/gitlab";
import { createGitlabQuery } from "@/shared/lib/gitlab/create-query";
import { VM } from "@/shared/lib/view-models/vm";
import { ProjectReadmeModel } from "./project-readme";
import { MaybePromise } from "yummies/types";

export class RepositoryPageVM extends VM {
  projectQuery;
  readmeModel;

  constructor(globals: Globals, params: ViewModelParams) {
    super(globals, params);
    console.log("KEK RepositoryPageVM create");

    this.projectQuery = createGitlabQuery<GitLabProjectDC>({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const projectId = this.projectId;
        if (projectId === null) {
          return false;
        }

        return {
          path: `/projects/${projectId}`,
        };
      },
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

  static resolveMergeRequestIid(globals: Globals): number | null {
    const mergeRequestIid =
      globals.routes.mergeRequest.params?.mergeRequestIid;

    if (!mergeRequestIid) {
      return null;
    }

    const iid = Number(mergeRequestIid);
    return Number.isNaN(iid) ? null : iid;
  }

  protected willMount(): MaybePromise<void> {
    console.log("KEK RepositoryPageVM willMount");
  }

  @computed
  get projectId(): number | null {
    const projectId = this.globals.routes.repository.params?.projectId;
    if (!projectId) {
      return null;
    }

    const id = Number(projectId);
    return Number.isNaN(id) ? null : id;
  }

  @computed
  get projectIdParam(): string {
    return this.projectId !== null ? String(this.projectId) : "";
  }

  @computed
  get mergeRequestIid(): number | null {
    return RepositoryPageVM.resolveMergeRequestIid(this.globals);
  }

  @computed
  get selectedProject(): GitLabProjectDC | null {
    const projectId = this.projectId;
    if (projectId === null) {
      return null;
    }

    const fromQuery = this.projectQuery.data;
    if (fromQuery && fromQuery.id === projectId) {
      return fromQuery;
    }

    const cached = this.globals.stores.repository.project;
    if (!cached || cached.id !== projectId) {
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

  @action.bound
  openFiles() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.files.open({ projectId });
  }

  @action.bound
  openMergeRequests() {
    const projectId = this.projectIdParam;
    if (!projectId) {
      return;
    }

    void this.globals.routes.mergeRequests.open({ projectId });
  }
}
