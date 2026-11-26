import {
  ArrowUpRightFromSquare,
  ChevronRight,
  CodeCommit,
  CodeFork,
  CodePullRequest,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { PipelineStatus } from '@/entities/gitlab-pipelines';
import { t } from '@/shared/lib/i18n';
import { getPipelineMergeRequestIid } from '../../model/pipeline-list';
import { DateTime } from './date-time';
import { RunAction } from './run-action';
import { durationLabel, type RunProps } from './run-presentation';

export const RunRow = observer(({ model, run }: RunProps) => {
  const list = model.pipelineList;
  const iid = getPipelineMergeRequestIid(run);
  const mr = list.mergeRequestForPipeline(run);
  const title =
    mr?.title ||
    (iid !== null ? t('pipelines.mergeRequest2', { v1: iid }) : run.ref);
  const titleId = `pipeline-title-${run.id}`;
  const statusId = `pipeline-status-${run.id}`;
  const duration = durationLabel(run.duration);
  const RefIcon = iid === null ? CodeFork : CodePullRequest;
  return (
    <li className="pipeline-run">
      <div className="pipeline-identity">
        <span className="pipeline-ref-icon" aria-hidden>
          <RefIcon width={18} height={18} />
        </span>
        <div className="min-w-0">
          <button
            className="pipeline-open"
            type="button"
            aria-haspopup="dialog"
            aria-label={t('pipelines.openPipeline', { v1: run.id })}
            aria-describedby={`${titleId} ${statusId}`}
            onClick={() => model.openDetails(run)}
          >
            <span id={titleId}>{title}</span>
          </button>
          <div className="pipeline-meta">
            <span className="font-mono">#{run.id}</span>
            {run.sha && (
              <span
                className="inline-flex items-center gap-1 font-mono"
                title={run.sha}
              >
                <CodeCommit width={13} height={13} aria-hidden />
                {run.sha.slice(0, 8)}
              </span>
            )}
            {mr?.source_branch && (
              <span className="truncate font-mono" title={mr.source_branch}>
                {mr.source_branch}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="pipeline-status" id={statusId}>
        <PipelineStatus status={run.status} />
      </div>
      <div className="pipeline-activity">
        <DateTime value={run.updated_at || run.created_at} />
        {duration && <span className="text-fg-muted text-xs">{duration}</span>}
      </div>
      <div className="pipeline-row-actions">
        {iid !== null && (
          <button
            className="pipeline-mr-link"
            type="button"
            aria-label={t('pipelines.openMergeRequest2', { v1: iid })}
            title={t('pipelines.openMergeRequest3', { v1: iid })}
            onClick={() => list.openMergeRequest(iid)}
          >
            <CodePullRequest width={14} height={14} aria-hidden />!{iid}
          </button>
        )}
        <RunAction model={model} run={run} compact />
        {run.web_url && (
          <a
            className="pipeline-icon-action"
            href={run.web_url}
            target="_blank"
            rel="noreferrer"
            aria-label={t('pipelines.openPipelineInGitlab', { v1: run.id })}
            title={t('common.openInGitLab')}
          >
            <ArrowUpRightFromSquare width={15} height={15} aria-hidden />
          </a>
        )}
      </div>
      <ChevronRight
        className="pipeline-chevron"
        width={15}
        height={15}
        aria-hidden
      />
    </li>
  );
});
