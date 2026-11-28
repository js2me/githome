import { Check, ChevronDown, LogoGitlab } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { ConnectionButtonVM } from '../model/connection-button';

export const ConnectionButton = withPropsViewModel(
  ConnectionButtonVM,
  ({ model }) => {
    const { placement, selected, expanded, onClick } = model.payload;
    const { name, host, label, profile, gitlabConnection } = model;
    const inHeader = placement === 'header';

    return (
      <button
        className={
          inHeader
            ? 'workbench-account'
            : 'flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[var(--glass-hover)] aria-pressed:bg-[var(--glass-selected)]'
        }
        type="button"
        aria-label={
          inHeader ? t('forge.connectionLabel', { name: label }) : label
        }
        aria-haspopup={inHeader ? 'dialog' : undefined}
        aria-expanded={inHeader ? expanded : undefined}
        aria-controls={inHeader ? 'workbench-connections-dialog' : undefined}
        aria-pressed={inHeader ? undefined : selected}
        title={label}
        onClick={onClick}
      >
        {gitlabConnection && profile && (name || profile.avatarUrl) ? (
          <GitlabAvatar
            className={
              inHeader
                ? 'workbench-account-avatar'
                : 'size-8 shrink-0 rounded-full object-cover'
            }
            connection={gitlabConnection}
            avatarUrl={profile.avatarUrl}
            name={name || host}
          />
        ) : gitlabConnection ? (
          <LogoGitlab
            className={
              inHeader
                ? 'size-4 shrink-0 text-fg-muted'
                : 'size-5 shrink-0 text-[var(--glass-accent)]'
            }
            aria-hidden
          />
        ) : null}
        <span
          className={inHeader ? 'workbench-account-label' : 'min-w-0 flex-1'}
        >
          <span
            className={
              inHeader
                ? 'workbench-account-name'
                : 'block truncate font-semibold text-sm leading-4'
            }
          >
            {name || host}
          </span>
          {name && (
            <span
              className={
                inHeader
                  ? 'workbench-account-host'
                  : 'block truncate text-[11px] text-fg-muted leading-3.5'
              }
            >
              {host}
            </span>
          )}
        </span>
        {inHeader && (
          <ChevronDown className="workbench-account-chevron" aria-hidden />
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
