import { observer } from 'mobx-react-lite';
import type { GitLabJobDC } from '@/shared/api/gitlab';
import type { PipelinesPageVM } from '../../model';
import { control } from './run-presentation';

export const JobActions = observer(
  ({ model, job }: { model: PipelinesPageVM; job: GitLabJobDC }) => {
    const list = model.pipelineList;
    const cancel = list.isJobCancelable(job);
    const label = cancel
      ? 'Остановить'
      : job.status === 'manual'
        ? 'Запустить'
        : 'Повторить';
    const open = model.traceJobId === job.id;
    return (
      <>
        {(cancel || list.canRunJob(job)) && (
          <button
            className={control}
            type="button"
            aria-label={`${label} задание ${job.name}`}
            disabled={list.busyPipelineId !== null || list.busyJobId !== null}
            onClick={() => void model.runJob(job)}
          >
            {list.busyJobId === job.id ? 'Выполняем…' : label}
          </button>
        )}
        <button
          className={control}
          type="button"
          aria-expanded={open}
          aria-label={`Лог задания ${job.name}`}
          onClick={() => model.toggleTrace(job.id)}
        >
          {open ? 'Скрыть лог' : 'Лог'}
        </button>
      </>
    );
  },
);
