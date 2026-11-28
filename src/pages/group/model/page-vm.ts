import {
  actionBound,
  compareShallow,
  observable,
  observableRef,
  reaction,
} from 'mobx';
import { WorkspaceVM } from '@/features/workspace-navigation';
import { createGroupOverviewQuery } from '@/shared/api/gitlab/queries/groups';

export class GroupPageVM extends WorkspaceVM {
  readonly expanded = observable.set<number>();

  @observableRef accessor overview:
    | ReturnType<GroupPageVM['createOverviewQuery']>
    | undefined;

  protected willMount() {
    this.overview = this.createOverviewQuery();
    reaction(
      () => {
        const connection = this.globals.stores.settings.activeConnection;
        return [
          this.globals.routes.group.params?.groupPath,
          connection?.id,
          connection?.credentialsRevision,
        ] as const;
      },
      this.collapseAll,
      { equals: compareShallow, signal: this.unmountSignal },
    );
  }

  @actionBound
  toggleGroup(id: number) {
    if (!this.expanded.delete(id)) this.expanded.add(id);
  }

  @actionBound
  collapseAll() {
    this.expanded.clear();
  }

  private createOverviewQuery() {
    return createGroupOverviewQuery({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const groupPath = this.globals.routes.group.params?.groupPath;
        return groupPath ? { groupPath } : false;
      },
    });
  }
}
