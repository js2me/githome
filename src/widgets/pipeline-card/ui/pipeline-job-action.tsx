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
  target: { job: string } | { stage: string };
  busy: boolean;
  disabled?: boolean;
  onRun: () => void;
}

export const PipelineJobAction = observer(
  ({ action, target, busy, disabled, onRun }: PipelineJobActionProps) => {
    const { Icon, key } = actions[action];
    const label =
      'job' in target
        ? t('pipelines.job', { v1: t(key), v2: target.job })
        : t('pipelines.runStage', { stage: target.stage });
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
        {busy ? (
          <span
            className="size-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
            aria-hidden
          />
        ) : (
          <Icon
            className={
              action === 'play' ? 'size-3.5 translate-x-px' : 'size-3.5'
            }
            aria-hidden
          />
        )}
      </button>
    );
  },
);
