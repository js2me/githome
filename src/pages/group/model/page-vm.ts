import { observableRef } from 'mobx';
import { WorkspaceVM } from '@/features/workspace-navigation';
import { getGroupOverview } from '@/shared/api/gitlab/endpoints/groups/get-group-overview';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/connection/create-query';

export class GroupPageVM extends WorkspaceVM {
  @observableRef accessor overview:
    | ReturnType<GroupPageVM['createOverviewQuery']>
    | undefined;

  protected willMount() {
    this.overview = this.createOverviewQuery();
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
        connection.credentialsRevision,
        groupPath,
      ],
      queryFn: ({ connection, groupPath, signal }) =>
        getGroupOverview(connection, groupPath, signal),
    });
  }
}
