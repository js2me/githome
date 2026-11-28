import {
  ChevronRight,
  CodeFork,
  CodePullRequest,
  Comment,
} from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { MrStateBadge, ReviewStatuses } from '@/entities/gitlab-merge-requests';
import { PipelineStatus } from '@/entities/gitlab-pipelines';
import { getLocale, t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { InboxPageRowsVM } from '../model/inbox-page-rows';

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(getLocale(), {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
};

export const InboxPageRows = withPropsViewModel(
  InboxPageRowsVM,
  ({ model }) => {
    const { rows, onSelect } = model.payload;
    return rows.map((request) => (
      <li key={request.id} className="home-list-item">
        <button
          className="home-request-row group"
          type="button"
          onClick={() => onSelect(request)}
        >
          <span
            className="home-request-icon grid size-7 shrink-0 place-items-center rounded-md"
            aria-hidden
          >
            <CodePullRequest className="size-4" />
          </span>
          <span className="home-request-content">
            <span className="flex min-w-0 items-baseline gap-2 font-mono text-xs">
              <span className="shrink-0 font-mono font-semibold text-[var(--glass-accent)]">
                !{request.iid}
              </span>
              <span
                className="truncate text-fg-muted"
                title={request.projectPath}
              >
                {request.projectPath}
              </span>
            </span>
            <span className="mt-1 block font-semibold text-sm leading-snug [overflow-wrap:anywhere]">
              {request.title}
            </span>
            <span className="home-request-meta">
              {(request.author?.name || request.author?.username) && (
                <span className="home-request-detail">
                  <GitlabAvatar
                    className="size-4 shrink-0 rounded-full object-cover text-[9px]"
                    avatarUrl={request.author.avatar_url}
                    name={request.author.name || request.author.username || ''}
                  />
                  <span className="truncate">
                    {request.author.name || request.author.username}
                  </span>
                </span>
              )}
              {request.source_branch && request.target_branch && (
                <span
                  className="home-request-detail"
                  title={`${request.source_branch} → ${request.target_branch}`}
                >
                  <CodeFork className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate font-mono">
                    {request.source_branch} → {request.target_branch}
                  </span>
                </span>
              )}
              {request.updated_at && (
                <time
                  dateTime={request.updated_at}
                  title={t('review.lastUpdated')}
                >
                  {formatUpdatedAt(request.updated_at)}
                </time>
              )}
            </span>
          </span>
          <span className="home-request-statuses">
            <MrStateBadge mergeRequest={request} />
            <ReviewStatuses {...model.statusesFor(request)} />
            {request.head_pipeline && (
              <PipelineStatus status={request.head_pipeline.status} />
            )}
            {Boolean(request.user_notes_count) && (
              <span
                className="home-request-detail"
                title={t('review.comments2', { v1: request.user_notes_count })}
              >
                <Comment className="size-3.5" aria-hidden />
                <span className="sr-only">{t('review.comments3')} </span>
                {request.user_notes_count}
              </span>
            )}
          </span>
          <ChevronRight
            className="home-request-chevron size-3.5 shrink-0 text-fg-muted group-hover:text-brand"
            aria-hidden
          />
        </button>
      </li>
    ));
  },
);
