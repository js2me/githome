import { Check, ChevronDown, LogoGitlab } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { ConnectionButtonVM } from '../model/connection-button';

export const ConnectionButton = withPropsViewModel(
  ConnectionButtonVM,
  ({ model }) => {
    const { connection, placement, selected, onClick } = model.payload;
    const { name, host, label, profile } = model;
    const inHeader = placement === 'header';

    return (
      <button
        className={
          inHeader
            ? 'glass-control inline-flex h-9 min-w-0 max-w-[min(60vw,16rem)] items-center gap-2 rounded-xl px-2 text-left sm:px-2.5'
            : 'flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[var(--glass-hover)] aria-pressed:bg-[var(--glass-selected)]'
        }
        type="button"
        aria-label={
          inHeader ? t('connection.gitlabConnections', { v1: label }) : label
        }
        aria-haspopup={inHeader ? 'dialog' : undefined}
        aria-pressed={inHeader ? undefined : selected}
        title={label}
        onClick={onClick}
      >
        {connection && profile && (name || profile.avatar_url) ? (
          <GitlabAvatar
            className={
              inHeader
                ? 'size-6 shrink-0 rounded-full object-cover'
                : 'size-8 shrink-0 rounded-full object-cover'
            }
            connection={connection}
            avatarUrl={profile.avatar_url}
            name={name || host}
          />
        ) : (
          <LogoGitlab
            className="size-5 shrink-0 text-[var(--glass-accent)]"
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-sm leading-4">
            {name || host}
          </span>
          {name && (
            <span className="block truncate text-[11px] text-fg-muted leading-3.5">
              {host}
            </span>
          )}
        </span>
        {inHeader && (
          <ChevronDown
            className="hidden size-3 shrink-0 text-fg-muted min-[480px]:block"
            aria-hidden
          />
        )}
        {!inHeader && selected && (
          <Check
            className="size-4 shrink-0 text-[var(--glass-accent)]"
            aria-hidden
          />
        )}
      </button>
    );
  },
);
