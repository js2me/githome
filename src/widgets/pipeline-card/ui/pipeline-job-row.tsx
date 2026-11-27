import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';
import {
  PipelineStatus,
  pipelineStatusLabel,
} from '@/entities/gitlab-pipelines';
import type { GitLabJobDC } from '@/shared/api/gitlab';
import { t } from '@/shared/lib/i18n';

interface PipelineJobRowProps {
  job: GitLabJobDC;
  expanded: boolean;
  detailsId: string;
  actions?: ReactNode;
  onToggle: () => void;
}

export const PipelineJobRow = observer(
  ({ job, expanded, detailsId, actions, onToggle }: PipelineJobRowProps) => (
    <li className="pipeline-graph-job">
      <button
        type="button"
        aria-label={t('pipelines.logForJob', { v1: job.name })}
        aria-description={pipelineStatusLabel(job.status)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggle}
        className="pipeline-graph-job-name"
        title={job.name}
      >
        <PipelineStatus status={job.status} iconOnly />
        <span>{job.name}</span>
      </button>
      {actions}
    </li>
  ),
);
