import { observer } from 'mobx-react-lite';
import { pipelineJobAction } from '@/entities/gitlab-pipelines';
import { t } from '@/shared/lib/i18n';
import type { PipelineDetailsDialogVM } from '../model/details-dialog';
import { PipelineJobAction } from './pipeline-job-action';
import { PipelineJobRow } from './pipeline-job-row';
import './stage-graph.css';

export const PipelineStageGraph = observer(
  ({
    model,
    detailsId,
  }: {
    model: PipelineDetailsDialogVM;
    detailsId: string;
  }) => {
    const controls = model.payload.jobControls;
    return (
      <div
        className="pipeline-graph"
        role="region"
        aria-label={t('pipelines.stageGraph')}
        tabIndex={0}
      >
        {model.stages.map(({ stage, jobs }) => {
          const manualJobs = controls
            ? jobs.filter(
                (job) =>
                  job.status === 'manual' ||
                  controls.pendingAction(job.id) === 'play',
              )
            : [];
          const playable = manualJobs.filter(
            (job) =>
              job.status === 'manual' && !controls?.pendingAction(job.id),
          );
          return (
            <section key={stage} className="pipeline-graph-stage">
              <div className="pipeline-graph-stage-header">
                <h3>{stage}</h3>
                {controls && manualJobs.length > 0 && (
                  <PipelineJobAction
                    action="play"
                    target={{ stage }}
                    busy={playable.length === 0}
                    disabled={controls.blocked || playable.length === 0}
                    onRun={() => void controls.run(playable)}
                  />
                )}
              </div>
              <ul>
                {jobs.map((job) => {
                  const pending = controls?.pendingAction(job.id);
                  const action = pending ?? pipelineJobAction(job.status);
                  return (
                    <PipelineJobRow
                      key={job.id}
                      job={job}
                      expanded={model.selectedJob?.id === job.id}
                      detailsId={detailsId}
                      onToggle={() => model.toggleJob(job.id)}
                      actions={
                        controls &&
                        action && (
                          <PipelineJobAction
                            action={action}
                            target={{ job: job.name }}
                            busy={Boolean(pending)}
                            disabled={controls.blocked || Boolean(pending)}
                            onRun={() => void controls.run([job])}
                          />
                        )
                      }
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    );
  },
);
