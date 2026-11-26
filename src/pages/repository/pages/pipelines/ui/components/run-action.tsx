import { ArrowRotateRight, CircleStop } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { control, type RunProps } from './run-presentation';

export const RunAction = observer(
  ({ model, run, compact = false }: RunProps & { compact?: boolean }) => {
    const list = model.pipelineList;
    const cancel = list.isPipelineCancelable(run);
    if (!cancel && !list.isPipelineRetryable(run)) return null;
    const label = cancel ? 'Остановить' : 'Повторить';
    const Icon = cancel ? CircleStop : ArrowRotateRight;
    const hint = `${label} пайплайн #${run.id}`;
    const busy = list.busyPipelineId === run.id;
    return (
      <button
        type="button"
        className={compact ? 'pipeline-icon-action' : control}
        aria-label={hint}
        title={hint}
        disabled={list.busyJobId !== null || list.busyPipelineId !== null}
        aria-busy={busy}
        onClick={() => void model.runPipeline(run, cancel ? 'cancel' : 'retry')}
      >
        <Icon width={16} height={16} aria-hidden />
        {!compact && (busy ? 'Выполняем…' : label)}
      </button>
    );
  },
);
