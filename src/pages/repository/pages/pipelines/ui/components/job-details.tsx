import { observer } from 'mobx-react-lite';
import type { GitLabJobDC } from '@/shared/api/gitlab';
import { t } from '@/shared/lib/i18n';
import type { PipelinesPageVM } from '../../model';
import { errorText } from './run-presentation';

export const JobDetails = observer(
  ({ model, job }: { model: PipelinesPageVM; job: GitLabJobDC }) => (
    <>
      {job.failure_reason && (
        <p className="mt-1 text-fg-muted text-xs">
          {t('pipelines.failureReason')}{' '}
          {job.failure_reason.replaceAll('_', ' ')}
        </p>
      )}
      {model.traceJobId === job.id && (
        <div className="mt-2 min-w-0">
          {model.trace.isLoading ? (
            <p role="status" className="text-fg-muted text-xs">
              {t('pipelines.loadingLog')}
            </p>
          ) : model.trace.error ? (
            <p role="alert" className="text-[var(--color-danger-fg)] text-sm">
              {errorText(model.trace.error, t('pipelines.couldNotLoadTheLog'))}
            </p>
          ) : (
            <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-slate-100 text-xs leading-relaxed [overflow-wrap:anywhere]">
              {model.trace.data || t('pipelines.theLogIsEmpty')}
            </pre>
          )}
        </div>
      )}
    </>
  ),
);
