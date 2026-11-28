import {
  ArrowRight,
  ArrowUpRightFromSquare,
  CircleCheck,
  Clock,
  CodeFork,
  CodePullRequest,
  Persons,
  TriangleExclamation,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';
import { MrStateBadge } from '@/entities/gitlab-merge-requests';
import type { GitLabMergeRequestDC } from '@/shared/api/gitlab';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import type { MergeRequestPageVM } from '../../../model';
import { actionClass } from './action-classes';
import { CopyControl } from './copy-control';
import { Timestamp } from './timestamp';

const mergeStates: Record<string, string> = {
  get can_be_merged() {
    return t('review.noConflicts');
  },
  get cannot_be_merged() {
    return t('review.mergeBlocked');
  },
  get cannot_be_merged_recheck() {
    return t('review.recheckingMerge');
  },
  get checking() {
    return t('review.checkingMerge');
  },
  get unchecked() {
    return t('review.mergeNotCheckedYet');
  },
};

export const MergeRequestOverview = observer(function MergeRequestOverview({
  mergeRequest,
  jira,
  projectPath,
  actions,
  reactions,
}: {
  mergeRequest: GitLabMergeRequestDC;
  jira: MergeRequestPageVM['jiraSummary'];
  projectPath?: ReactNode;
  actions?: ReactNode;
  reactions?: ReactNode;
}) {
  const mr = mergeRequest;
  const { titleParts, jiraProjects, branchIssues } = jira;
  const author = mr.author?.name || mr.author?.username;
  const assignees = mr.assignees
    ?.map((user) => user.name)
    .filter(Boolean)
    .join(', ');
  const blocked = mr.has_conflicts || mr.merge_status === 'cannot_be_merged';
  const mergeLabel = mr.has_conflicts
    ? t('review.hasConflicts')
    : mr.merge_status &&
      (mergeStates[mr.merge_status] ?? mr.merge_status.replaceAll('_', ' '));
  const MergeIcon = blocked
    ? TriangleExclamation
    : mr.merge_status === 'can_be_merged'
      ? CircleCheck
      : Clock;

  return (
    <header
      aria-label={t('review.mergeRequestSummary')}
      className="@container min-w-0"
    >
      <div className="flex min-w-0 flex-col gap-3 pb-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 max-w-full flex-auto items-center gap-1.5 text-fg-muted text-xs">
            <CodePullRequest
              aria-hidden="true"
              className="shrink-0 text-[var(--glass-accent)]"
              width={16}
              height={16}
            />
            {projectPath}
            <span className="shrink-0 font-mono font-semibold text-fg-default">
              !{mr.iid}
            </span>
            <MrStateBadge mergeRequest={mr} />
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-1.5">
            {actions}
            <CopyControl
              key={mr.web_url}
              value={mr.web_url}
              label={t('review.copyMergeRequestLink')}
            />
            {Array.from(jiraProjects, ([url, projectKey]) => (
              <a
                key={url}
                className={cn(actionClass, 'max-w-full no-underline')}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('review.openProjectInJira', { v1: projectKey })}
                title={t('review.openProjectInJira', { v1: projectKey })}
              >
                <span className="truncate">Jira · {projectKey}</span>
                <ArrowUpRightFromSquare
                  aria-hidden="true"
                  width={14}
                  height={14}
                  className="shrink-0"
                />
              </a>
            ))}
            <a
              className={cn(actionClass, 'no-underline')}
              href={mr.web_url}
              target="_blank"
              rel="noreferrer"
              aria-label={t('common.openInGitLab')}
              title={t('common.openInGitLab')}
            >
              <span className="sr-only @xs:not-sr-only">GitLab</span>
              <ArrowUpRightFromSquare
                aria-hidden="true"
                width={14}
                height={14}
              />
            </a>
          </div>
        </div>

        <h1 className="m-0 font-semibold @lg:text-[26px] text-fg-default text-xl leading-tight tracking-tight [overflow-wrap:anywhere]">
          {titleParts.map(({ text, key, url, offset }) =>
            key && url ? (
              <a
                key={offset}
                className="rounded-sm text-fg-link underline decoration-1 underline-offset-4 hover:decoration-2"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('review.openIssueInJira', { v1: key })}
              >
                {text}
              </a>
            ) : (
              text
            ),
          )}
        </h1>

        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 max-w-full items-center gap-1.5 text-fg-muted">
            <CodeFork
              aria-hidden="true"
              width={15}
              height={15}
              className="@md:block hidden shrink-0"
            />
            <CopyControl
              key={`source-${mr.source_branch}`}
              branch="source"
              value={mr.source_branch}
              label={t('review.copySourceBranch')}
            />
            <ArrowRight
              aria-hidden="true"
              width={14}
              height={14}
              className="shrink-0"
            />
            <CopyControl
              key={`target-${mr.target_branch}`}
              branch="target"
              value={mr.target_branch}
              label={t('review.copyTargetBranch')}
            />
          </div>
          {branchIssues.map(({ key, url }) => (
            <a
              key={key}
              className="inline-flex items-center gap-1 rounded-sm font-medium text-fg-link text-xs underline underline-offset-2"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('review.openIssueInJira', { v1: key })}
            >
              {key}
              <ArrowUpRightFromSquare
                aria-hidden="true"
                width={12}
                height={12}
              />
            </a>
          ))}
          {mr.state === 'opened' && mergeLabel && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 font-medium text-xs',
                blocked ? 'text-[var(--color-danger-fg)]' : 'text-fg-muted',
              )}
            >
              <MergeIcon
                aria-hidden="true"
                width={15}
                height={15}
                className={
                  !blocked && mr.merge_status === 'can_be_merged'
                    ? 'text-[var(--color-success-fg)]'
                    : undefined
                }
              />
              {mergeLabel}
            </span>
          )}
        </div>
        {reactions}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1.5 text-fg-muted text-xs">
          <div className="flex min-w-0 items-center gap-2">
            {author && (
              <GitlabAvatar
                className="size-5 shrink-0 rounded-md object-cover"
                avatarUrl={mr.author?.avatar_url}
                name={author}
              />
            )}
            <div className="min-w-0">
              {author && (
                <div className="font-medium text-fg-default [overflow-wrap:anywhere]">
                  {author}
                </div>
              )}
              {mr.created_at && (
                <div>
                  {t('review.created')} <Timestamp value={mr.created_at} />
                </div>
              )}
            </div>
          </div>
          {assignees && (
            <div
              className="inline-flex max-w-full items-center gap-1.5"
              title={t('review.assignees')}
            >
              <Persons
                aria-hidden="true"
                width={15}
                height={15}
                className="shrink-0"
              />
              <span className="min-w-0">
                <span className="block">
                  {mr.assignees?.length === 1
                    ? t('review.assignee')
                    : t('review.assignees')}
                </span>
                <span className="font-medium text-fg-default [overflow-wrap:anywhere]">
                  {assignees}
                </span>
              </span>
            </div>
          )}
          {mr.updated_at && (
            <span>
              {t('common.updated')} <Timestamp value={mr.updated_at} />
            </span>
          )}
        </div>
      </div>
    </header>
  );
});
