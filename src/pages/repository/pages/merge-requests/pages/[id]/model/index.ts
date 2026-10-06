import { reaction, type IReactionDisposer } from "mobx";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { RepositoryPageVM } from "@/pages/repository/model/page-vm";
import { VM } from "@/shared/lib/view-models/vm";
import { MrInfoModel } from "./mr-info";

export class MergeRequestPageVM extends VM<{}, RepositoryPageVM> {
  mrInfo;
  private disposeTabDetailsReaction: IReactionDisposer | null = null;

  get projectId() {
    return this.parentViewModel.projectId;
  }

  get selectedProject() {
    return this.parentViewModel.selectedProject;
  }

  get mergeRequestIid() {
    return this.parentViewModel.mergeRequestIid;
  }

  get project() {
    return this.parentViewModel.project;
  }

  constructor(globals: Globals, params: ViewModelParams<{}, RepositoryPageVM>) {
    super(globals, params);

    this.mrInfo = new MrInfoModel({
      globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const project = this.selectedProject;
        const mergeRequestIid = this.mergeRequestIid;

        if (!project || mergeRequestIid === null) {
          return false;
        }

        return { project, mergeRequestIid };
      },
    });

    this.disposeTabDetailsReaction = reaction(
      () => ({
        connectionId: this.globals.stores.settings.activeId,
        projectId: this.projectId,
        project: this.project,
        mergeRequestIid: this.mergeRequestIid,
        title: this.mrInfo.mergeRequestDetail?.title,
      }),
      ({ connectionId, projectId, project, mergeRequestIid, title }) => {
        if (
          !connectionId ||
          projectId === null ||
          mergeRequestIid === null ||
          !title
        ) {
          return;
        }

        this.globals.navigation.mergeRequests.updateDetails(
          connectionId,
          projectId,
          mergeRequestIid,
          {
            title,
            projectPath: project?.path_with_namespace,
          },
        );
      },
    );
  }

  willUnmount() {
    this.disposeTabDetailsReaction?.();
    this.disposeTabDetailsReaction = null;
  }
}
