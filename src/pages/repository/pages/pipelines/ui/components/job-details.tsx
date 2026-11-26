import { observer } from 'mobx-react-lite';
import type { GitLabJobDC } from '@/shared/api/gitlab';
import type { PipelinesPageVM } from '../../model';
import { errorText } from './run-presentation';

export const JobDetails = observer(
  ({ model, job }: { model: PipelinesPageVM; job: GitLabJobDC }) => (
    <>
      {job.failure_reason && (
        <p className="mt-1 text-fg-muted text-xs">
          Причина сбоя — {job.failure_reason.replaceAll('_', ' ')}
        </p>
      )}
      {model.traceJobId === job.id && (
        <div className="mt-2 min-w-0">
          {model.trace.isLoading ? (
            <p role="status" className="text-fg-muted text-xs">
              Загружаем лог…
            </p>
          ) : model.trace.error ? (
            <p role="alert" className="text-[var(--color-danger-fg)] text-sm">
              {errorText(model.trace.error, 'Не удалось загрузить лог')}
            </p>
          ) : (
            <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-slate-100 text-xs leading-relaxed [overflow-wrap:anywhere]">
              {model.trace.data || 'Лог пока пуст.'}
            </pre>
          )}
        </div>
      )}
    </>
  ),
);
