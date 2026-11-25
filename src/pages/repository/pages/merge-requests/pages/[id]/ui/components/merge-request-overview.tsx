import {
  ArrowRight,
  ArrowUpRightFromSquare,
  Check,
  CircleCheck,
  Clock,
  CodeFork,
  CodePullRequest,
  Comments,
  Copy,
  Files,
  Link,
  Persons,
  TriangleExclamation,
  Xmark,
} from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import type { ReactNode } from 'react';
import { MrStateBadge } from '@/entities/gitlab-merge-requests';
import type { GitLabMergeRequestDC } from '@/shared/api/gitlab';
import { cn } from '@/shared/lib/cn';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import type { MergeRequestPageVM } from '../../model';
import { CopyControlVM } from '../../model/copy-control';

const shortDate = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const fullDate = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'long',
  timeStyle: 'short',
});

function Timestamp({ value }: { value: string }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>{value}</>;
  return (
    <time dateTime={value} title={fullDate.format(date)}>
      {shortDate.format(date)}
    </time>
  );
}

const actionClass =
  'glass-control inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold';
const jumpClass =
  'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-fg-default hover:bg-[var(--glass-hover)]';

const CopyControl = withPropsViewModel(CopyControlVM, ({ model }) => {
  const { value, label, branch } = model.payload;
  const copyStatus = model.clipboard.status;
  const actionLabel = branch ? `${label} ${value}` : label;
  const feedback =
    copyStatus === 'copied'
      ? 'Скопировано'
      : copyStatus === 'failed'
        ? 'Не удалось скопировать'
        : '';
  const Icon =
    copyStatus === 'copied'
      ? Check
      : copyStatus === 'failed'
        ? Xmark
        : branch
          ? Copy
          : Link;
  return (
    <button
      type="button"
      className={cn(
        actionClass,
        branch && 'min-w-0 font-mono',
        branch === 'target' && 'max-w-[45%] shrink-0',
      )}
      aria-label={actionLabel}
      title={feedback || actionLabel}
      onClick={model.copy}
    >
      {branch && <span className="truncate">{value}</span>}
      <Icon
        aria-hidden="true"
        width={14}
        height={14}
        className={cn(
          'shrink-0',
          copyStatus === 'copied' && 'text-[var(--color-success-fg)]',
          copyStatus === 'failed' && 'text-[var(--color-danger-fg)]',
        )}
      />
      {!branch && (
        <span className="sr-only @md:not-sr-only">{feedback || 'Ссылка'}</span>
      )}
      <span className="sr-only" role="status">
        {feedback}
      </span>
    </button>
  );
});

const mergeStates: Record<string, string> = {
  can_be_merged: 'Без конфликтов',
  cannot_be_merged: 'Слияние заблокировано',
  cannot_be_merged_recheck: 'Повторная проверка слияния',
  checking: 'Проверка слияния',
  unchecked: 'Слияние ещё не проверено',
};

export function MergeRequestOverview({
  mergeRequest,
  jira,
  projectPath,
  loadedFiles,
  onShowFiles,
  onShowComments,
  children,
}: {
  mergeRequest: GitLabMergeRequestDC;
  jira: MergeRequestPageVM['jiraSummary'];
  projectPath: string;
  loadedFiles: number;
  onShowFiles: () => void;
  onShowComments: () => void;
  children?: ReactNode;
}) {
  const mr = mergeRequest;
  const { titleParts, jiraProjects, branchIssues } = jira;
  const author = mr.author?.name || mr.author?.username;
  const assignees = mr.assignees
    ?.map((user) => user.name)
    .filter(Boolean)
    .join(', ');
  const fileCount = mr.changes_count || loadedFiles || undefined;
  const blocked = mr.has_conflicts || mr.merge_status === 'cannot_be_merged';
  const mergeLabel = mr.has_conflicts
    ? 'Есть конфликты'
    : mr.merge_status &&
      (mergeStates[mr.merge_status] ?? mr.merge_status.replaceAll('_', ' '));
  const MergeIcon = blocked
    ? TriangleExclamation
    : mr.merge_status === 'can_be_merged'
      ? CircleCheck
      : Clock;

  return (
    <header
      aria-label="Сводка merge request"
      className="@container glass-panel min-w-0 rounded-2xl"
    >
      <div className="flex min-w-0 flex-col gap-3 @md:px-5 px-3.5 @md:pt-4 pt-3.5 pb-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 max-w-full flex-auto items-center gap-1.5 text-fg-muted text-xs">
            <CodePullRequest
              aria-hidden="true"
              className="shrink-0 text-[var(--glass-accent)]"
              width={16}
              height={16}
            />
            {projectPath && (
              <>
                <span
                  className="@xs:inline hidden truncate"
                  title={projectPath}
                >
                  {projectPath}
                </span>
                <span aria-hidden="true" className="@xs:inline hidden">
                  /
                </span>
              </>
            )}
            <span className="shrink-0 font-mono font-semibold text-fg-default">
              !{mr.iid}
            </span>
            <MrStateBadge mergeRequest={mr} language="ru" />
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-1.5">
            <CopyControl
              key={mr.web_url}
              value={mr.web_url}
              label="Скопировать ссылку на MR"
            />
            {Array.from(jiraProjects, ([url, projectKey]) => (
              <a
                key={url}
                className={cn(
                  actionClass,
                  'max-w-full text-fg-link no-underline',
                )}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Открыть проект ${projectKey} в Jira`}
                title={`Открыть проект ${projectKey} в Jira`}
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
              className={cn(
                actionClass,
                'text-[var(--glass-accent)] no-underline',
              )}
              href={mr.web_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Открыть в GitLab"
              title="Открыть в GitLab"
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

        <h2 className="m-0 font-semibold @lg:text-[26px] text-fg-default text-xl leading-tight tracking-tight [overflow-wrap:anywhere]">
          {titleParts.map(({ text, key, url, offset }) =>
            key && url ? (
              <a
                key={offset}
                className="rounded-sm text-fg-link underline decoration-1 underline-offset-4 hover:decoration-2"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Открыть задачу ${key} в Jira`}
              >
                {text}
              </a>
            ) : (
              text
            ),
          )}
        </h2>

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
              label="Скопировать исходную ветку"
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
              label="Скопировать целевую ветку"
            />
          </div>
          {branchIssues.map(({ key, url }) => (
            <a
              key={key}
              className="inline-flex items-center gap-1 rounded-sm font-medium text-fg-link text-xs underline underline-offset-2"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Открыть задачу ${key} в Jira`}
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
          {mr.labels?.map((label) => (
            <span
              key={label}
              className="max-w-full rounded-lg bg-violet-500/10 px-2 py-0.5 font-medium text-violet-800 text-xs [overflow-wrap:anywhere] dark:text-violet-200"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-[var(--glass-border)] border-t @md:px-5 px-3.5 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1.5 text-fg-muted text-xs">
          <div className="flex min-w-0 items-center gap-2">
            {author && (
              <GitlabAvatar
                className="size-7 shrink-0 rounded-full object-cover"
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
                  Создан <Timestamp value={mr.created_at} />
                </div>
              )}
            </div>
          </div>
          {assignees && (
            <div
              className="inline-flex max-w-full items-center gap-1.5"
              title="Ответственные"
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
                    ? 'Ответственный'
                    : 'Ответственные'}
                </span>
                <span className="font-medium text-fg-default [overflow-wrap:anywhere]">
                  {assignees}
                </span>
              </span>
            </div>
          )}
          {mr.updated_at && (
            <span>
              Обновлён <Timestamp value={mr.updated_at} />
            </span>
          )}
        </div>
        <nav
          className="-ml-2 flex max-w-full flex-wrap items-center gap-x-1"
          aria-label="Разделы merge request"
        >
          <button type="button" className={jumpClass} onClick={onShowFiles}>
            <Files aria-hidden="true" width={15} height={15} /> Файлы{' '}
            <span className="font-mono text-fg-muted">{fileCount}</span>
          </button>
          <button type="button" className={jumpClass} onClick={onShowComments}>
            <Comments aria-hidden="true" width={15} height={15} /> Комментарии{' '}
            <span className="font-mono text-fg-muted">
              {mr.user_notes_count ?? 0}
            </span>
          </button>
        </nav>
      </div>
      {children && <div className="@md:px-5 px-3.5 pb-3">{children}</div>}
    </header>
  );
}
