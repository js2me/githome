import { observer } from 'mobx-react-lite';
import type { GitLabJobDC } from '@/shared/api/gitlab';
import { PipelineJobAction } from '@/widgets/pipeline-card';
import type { PipelinesPageVM } from '../../model';

export const JobActions = observer(
  ({ model, job }: { model: PipelinesPageVM; job: GitLabJobDC }) => {
    const list = model.pipelineList;
    const action = list.jobAction(job);
    if (!action) return null;
    return (
      <PipelineJobAction
        action={action}
        jobName={job.name}
        busy={list.busyJobId === job.id}
        disabled={list.busyPipelineId !== null || list.busyJobId !== null}
        onRun={() => void model.runJob(job)}
      />
    );
  },
);
