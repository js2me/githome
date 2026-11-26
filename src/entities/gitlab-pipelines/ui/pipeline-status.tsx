import {
  CircleCheckFill,
  CircleDashed,
  CircleMinus,
  CirclePause,
  CirclePlay,
  CircleXmarkFill,
  Clock,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { type MessageKey, t } from '@/shared/lib/i18n';

interface StatusAppearance {
  labelKey: MessageKey;
  icon: typeof Clock;
  color?: string;
}

const waiting = { icon: Clock, color: 'text-[var(--glass-accent)]' };
const statuses: Record<string, StatusAppearance> = {
  success: {
    labelKey: 'pipelines.passed',
    icon: CircleCheckFill,
    color: 'text-[var(--color-success-fg)]',
  },
  failed: {
    labelKey: 'pipelines.failed',
    icon: CircleXmarkFill,
    color: 'text-[var(--color-danger-fg)]',
  },
  running: {
    labelKey: 'pipelines.running',
    icon: CirclePlay,
    color: 'text-[var(--color-accent-blue)]',
  },
  canceled: {
    labelKey: 'pipelines.canceled',
    icon: CircleMinus,
  },
  canceling: {
    labelKey: 'pipelines.canceling',
    icon: CircleMinus,
  },
  skipped: {
    labelKey: 'pipelines.skipped',
    icon: CircleMinus,
  },
  manual: {
    labelKey: 'pipelines.manual',
    icon: CirclePause,
    color: waiting.color,
  },
  blocked: {
    labelKey: 'pipelines.blocked',
    icon: CirclePause,
    color: waiting.color,
  },
  created: {
    labelKey: 'pipelines.created',
    ...waiting,
  },
  scheduled: {
    labelKey: 'pipelines.scheduled',
    ...waiting,
  },
  preparing: {
    labelKey: 'pipelines.preparing',
    ...waiting,
  },
  pending: {
    labelKey: 'pipelines.pending',
    ...waiting,
  },
  waiting_for_resource: {
    labelKey: 'pipelines.waitingForResources',
    ...waiting,
  },
  waiting_for_callback: {
    labelKey: 'pipelines.waitingForCallback',
    ...waiting,
  },
};

export const pipelineStatusLabel = (status: string): string => {
  const key = statuses[status]?.labelKey;
  return key ? t(key) : status.replaceAll('_', ' ');
};

export const PipelineStatus = observer(({ status }: { status: string }) => {
  const { icon: Icon = CircleDashed, color = 'text-fg-muted' } =
    statuses[status] ?? {};
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 font-semibold text-xs ${color}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{pipelineStatusLabel(status)}</span>
    </span>
  );
});
