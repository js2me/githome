import {
  actionBound,
  compareShallow,
  observable,
  observableRef,
  reaction,
} from 'mobx';
import { WorkspaceVM } from '@/features/workspace-navigation';
import { getGroupOverview } from '@/shared/api/gitlab/endpoints/groups/get-group-overview';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/connection/create-query';

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
    return createGitlabApiQuery({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const groupPath = this.globals.routes.group.params?.groupPath;
        return groupPath ? { groupPath } : false;
      },
      queryKey: ({ connection, groupPath }) => [
        'group-overview',
        connection.id,
        connection.gitlabUrl,
        connection.credentialsRevision,
        groupPath,
      ],
      queryFn: ({ connection, groupPath, signal }) =>
        getGroupOverview(connection, groupPath, signal),
    });
  }
}
