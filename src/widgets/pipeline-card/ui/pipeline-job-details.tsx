import { ArrowUpRightFromSquare } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { durationLabel, PipelineStatus } from '@/entities/gitlab-pipelines';
import type { GitLabJobDC } from '@/shared/api/gitlab';
import { getLocale, t } from '@/shared/lib/i18n';
import { JobLog } from './job-log';

const describeTime = (value: string) =>
  new Date(value).toLocaleString(getLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  });

export const PipelineJobDetails = observer(
  ({ projectId, job }: { projectId: number; job: GitLabJobDC }) => {
    const duration = durationLabel(job.duration);
    const queued = durationLabel(job.queued_duration);
    const runner = job.runner?.description || job.runner?.name;
    const metadata = [
      { label: t('pipelines.duration'), value: duration },
      { label: t('pipelines.jobQueuedDuration'), value: queued },
      { label: t('pipelines.jobRunner'), value: runner },
      {
        label: t('pipelines.jobStartedAt'),
        value: job.started_at && (
          <time dateTime={job.started_at}>{describeTime(job.started_at)}</time>
        ),
      },
      {
        label: t('pipelines.jobFinishedAt'),
        value: job.finished_at && (
          <time dateTime={job.finished_at}>
            {describeTime(job.finished_at)}
          </time>
        ),
      },
    ];

    return (
      <section className="min-w-0 space-y-3 rounded-xl border border-[var(--glass-border)] p-3">
        <header className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 font-semibold text-sm [overflow-wrap:anywhere]">
            {job.name}
          </h3>
          <PipelineStatus status={job.status} />
          {job.web_url && (
            <a
              className="ml-auto inline-flex items-center gap-1 text-fg-link text-xs hover:underline"
              href={job.web_url}
              target="_blank"
              rel="noreferrer"
            >
              {t('common.openInGitLab')}
              <ArrowUpRightFromSquare className="size-3" aria-hidden />
            </a>
          )}
        </header>
        {metadata.some(({ value }) => value) && (
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs [overflow-wrap:anywhere] [&_dt]:text-fg-muted">
            {metadata.flatMap(({ label, value }) =>
              value
                ? [
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>,
                  ]
                : [],
            )}
          </dl>
        )}
        {job.failure_reason && (
          <p className="text-fg-muted text-xs [overflow-wrap:anywhere]">
            {t('pipelines.failureReason')}{' '}
            {job.failure_reason.replaceAll('_', ' ')}
          </p>
        )}
        <JobLog
          key={job.id}
          projectId={projectId}
          jobId={job.id}
          name={job.name}
          status={job.status}
        />
      </section>
    );
  },
);
