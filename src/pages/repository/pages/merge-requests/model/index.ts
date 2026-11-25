import { computed, observableRef } from 'mobx';
import { WorkspaceVM } from '@/features/workspace-navigation';
import type { RepositoryPageVM } from '../../../model/page-vm';
import { MrList } from './mr-list';

export class MergeRequestsPageVM extends WorkspaceVM<{}, RepositoryPageVM> {
  @observableRef accessor mrList: MrList | null = null;

  @computed
  get projectId() {
    return this.parentViewModel.projectId;
  }

  @computed
  get selectedProject() {
    return this.parentViewModel.selectedProject;
  }

  @computed
  get mergeRequestIid() {
    return this.parentViewModel.mergeRequestIid;
  }

  protected willMount() {
    this.mrList = new MrList(this);
  }
}
