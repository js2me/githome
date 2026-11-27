import { ArrowsRotateRight, PlayFill, StopFill } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';

const actions = {
  play: { Icon: PlayFill, key: 'pipelines.run' },
  retry: { Icon: ArrowsRotateRight, key: 'common.retry' },
  cancel: { Icon: StopFill, key: 'common.cancel2' },
} as const;

interface PipelineJobActionProps {
  action: keyof typeof actions;
  jobName: string;
  busy: boolean;
  disabled: boolean;
  onRun: () => void;
}

export const PipelineJobAction = observer(
  ({ action, jobName, busy, disabled, onRun }: PipelineJobActionProps) => {
    const { Icon, key } = actions[action];
    const label = t('pipelines.job', { v1: t(key), v2: jobName });
    return (
      <button
        className="pipeline-graph-action"
        type="button"
        aria-label={label}
        title={label}
        aria-busy={busy}
        disabled={disabled}
        onClick={onRun}
      >
        <Icon className="size-3.5" aria-hidden />
      </button>
    );
  },
);
