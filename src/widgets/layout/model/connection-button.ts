import { computed } from 'mobx';
import type { ForgeSession } from '@/shared/api/forge/adapter';
import { createForgeAccountQuery } from '@/shared/lib/forge/queries';
import { t } from '@/shared/lib/i18n';
import { VM } from '@/shared/lib/view-models/vm';

interface ConnectionButtonPayload {
  session: ForgeSession | null;
  fallbackLabel?: string;
  placement: 'header' | 'list';
  selected?: boolean;
  expanded?: boolean;
  onClick: () => void;
}

export class ConnectionButtonVM extends VM<ConnectionButtonPayload> {
  private readonly profileQuery = createForgeAccountQuery(
    () => this.payload.session,
    this.unmountSignal,
  );

  @computed get gitlabConnection() {
    return this.payload.session?.gitlabConnection;
  }

  @computed get profile() {
    return this.profileQuery.isError ? undefined : this.profileQuery.data;
  }

  @computed get name() {
    return this.profile?.name?.trim() || this.profile?.username?.trim();
  }

  @computed get host() {
    return (
      this.payload.session?.host ??
      this.payload.fallbackLabel ??
      t('forge.connect')
    );
  }

  @computed get label() {
    return this.name ? `${this.name} · ${this.host}` : this.host;
  }
}
