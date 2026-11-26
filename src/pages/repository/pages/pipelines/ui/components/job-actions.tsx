import { observer } from 'mobx-react-lite';
import type { GitLabJobDC } from '@/shared/api/gitlab';
import { t } from '@/shared/lib/i18n';
import type { PipelinesPageVM } from '../../model';
import { control } from './run-presentation';

export const JobActions = observer(
  ({ model, job }: { model: PipelinesPageVM; job: GitLabJobDC }) => {
    const list = model.pipelineList;
    const cancel = list.isJobCancelable(job);
    const label = cancel
      ? t('common.cancel2')
      : job.status === 'manual'
        ? t('pipelines.run')
        : t('common.retry');
    const open = model.traceJobId === job.id;
    return (
      <>
        {(cancel || list.canRunJob(job)) && (
          <button
            className={control}
            type="button"
            aria-label={t('pipelines.job', { v1: label, v2: job.name })}
            disabled={list.busyPipelineId !== null || list.busyJobId !== null}
            onClick={() => void model.runJob(job)}
          >
            {list.busyJobId === job.id ? t('pipelines.working') : label}
          </button>
        )}
        <button
          className={control}
          type="button"
          aria-expanded={open}
          aria-label={t('pipelines.logForJob', { v1: job.name })}
          onClick={() => model.toggleTrace(job.id)}
        >
          {open ? t('pipelines.hideLog') : t('pipelines.log')}
        </button>
      </>
    );
  },
);
