import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { PipelineDetailsDialogVM } from '../model/details-dialog';
import { PipelineJobRow } from './pipeline-job-row';
import './stage-graph.css';

export const PipelineStageGraph = observer(
  ({
    model,
    detailsId,
  }: {
    model: PipelineDetailsDialogVM;
    detailsId: string;
  }) => (
    <div
      className="pipeline-graph"
      role="region"
      aria-label={t('pipelines.stageGraph')}
      tabIndex={0}
    >
      {model.stages.map(({ stage, jobs }) => (
        <section key={stage} className="pipeline-graph-stage">
          <h3>{stage}</h3>
          <ul>
            {jobs.map((job) => (
              <PipelineJobRow
                key={job.id}
                job={job}
                expanded={model.selectedJob?.id === job.id}
                detailsId={detailsId}
                onToggle={() => model.toggleJob(job.id)}
                actions={model.payload.renderJobActions?.(job)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  ),
);
