import { ArrowRotateRight, CircleStop } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { control, type RunProps } from './run-presentation';

export const RunAction = observer(
  ({ model, run, compact = false }: RunProps & { compact?: boolean }) => {
    const list = model.pipelineList;
    const cancel = list.isPipelineCancelable(run);
    if (!cancel && !list.isPipelineRetryable(run)) return null;
    const label = cancel ? t('common.cancel2') : t('common.retry');
    const Icon = cancel ? CircleStop : ArrowRotateRight;
    const hint = t('pipelines.pipeline', { v1: label, v2: run.id });
    const busy = list.busyPipelineId === run.id;
    return (
      <button
        type="button"
        className={compact ? 'pipeline-icon-action' : control}
        aria-label={hint}
        title={hint}
        disabled={list.jobRunner.hasPending || list.busyPipelineId !== null}
        aria-busy={busy}
        onClick={() => void model.runPipeline(run, cancel ? 'cancel' : 'retry')}
      >
        <Icon width={16} height={16} aria-hidden />
        {!compact && (busy ? t('pipelines.working') : label)}
      </button>
    );
  },
);
