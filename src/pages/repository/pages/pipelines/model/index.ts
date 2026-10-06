import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { PipelineList } from "@/entities/gitlab-pipelines/model/pipeline-list";
import { RepositoryPageVM } from "@/pages/repository/model/page-vm";
import { VM } from "@/shared/lib/view-models/vm";

export class PipelinesPageVM extends VM<{}, RepositoryPageVM> {
  readonly pipelineList: PipelineList;

  constructor(globals: Globals, params: ViewModelParams<{}, RepositoryPageVM>) {
    super(globals, params);

    this.pipelineList = new PipelineList({
      globals,
      abortSignal: this.unmountSignal,
      projectId: () => this.parentViewModel.projectId,
      project: () => this.parentViewModel.project,
      defaultBranch: () =>
        this.parentViewModel.project?.default_branch?.trim() ?? null,
      canManagePipelines: () => {
        const permissions = this.parentViewModel.project?.permissions;
        const accessLevel = Math.max(
          permissions?.project_access?.access_level ?? 0,
          permissions?.group_access?.access_level ?? 0,
        );
        return accessLevel >= 30;
      },
    });
  }
}
