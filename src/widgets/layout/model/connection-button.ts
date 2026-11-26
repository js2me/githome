import { computed } from 'mobx';
import { createQuery, queryClient } from 'mobx-tanstack-query/preset';
import {
  type GitLabConnection,
  getConnectionLabel,
} from '@/shared/lib/gitlab/connection/connection';
import { connectionProfileOptions } from '@/shared/lib/gitlab/connection/connection-profile-query';
import { t } from '@/shared/lib/i18n';
import { VM } from '@/shared/lib/view-models/vm';

interface ConnectionButtonPayload {
  connection: GitLabConnection | null;
  placement: 'header' | 'list';
  selected?: boolean;
  onClick: () => void;
}

export class ConnectionButtonVM extends VM<ConnectionButtonPayload> {
  private readonly profileQuery = createQuery(queryClient, () => ({
    ...connectionProfileOptions(this.payload.connection),
    abortSignal: this.unmountSignal,
  }));

  @computed get profile() {
    return this.profileQuery.isError ? undefined : this.profileQuery.data;
  }

  @computed get name() {
    return this.profile?.name?.trim() || this.profile?.username?.trim();
  }

  @computed get host() {
    return this.payload.connection
      ? getConnectionLabel(this.payload.connection)
      : t('common.connectToGitlab2');
  }

  @computed get label() {
    return this.name ? `${this.name} · ${this.host}` : this.host;
  }
}
