import {
  Check,
  CircleCheckFill,
  CircleDashed,
  CircleMinus,
  CirclePause,
  CircleXmarkFill,
  Clock,
  Minus,
  PauseFill,
  Xmark,
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
    icon: CircleDashed,
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

export const PipelineStatus = observer(
  ({ status, iconOnly = false }: { status: string; iconOnly?: boolean }) => {
    const appearance = statuses[status];
    const { icon: Icon = CircleDashed, color = 'text-fg-muted' } =
      appearance ?? {};
    const label = pipelineStatusLabel(status);

    const spinning = status === 'running' || status === 'canceling';
    const spinner = (
      <span
        className="size-full rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        aria-hidden
      />
    );

    if (iconOnly) {
      const StatusIcon =
        status === 'success'
          ? Check
          : status === 'failed'
            ? Xmark
            : status === 'manual' || status === 'blocked'
              ? PauseFill
              : status === 'canceled' || status === 'skipped'
                ? Minus
                : Icon;
      return (
        <span
          role="img"
          aria-label={label}
          title={label}
          className={`grid size-6 shrink-0 place-items-center rounded-full bg-current/10 ${color} ${spinning ? '' : 'border-2 border-current'}`}
        >
          {spinning ? spinner : <StatusIcon className="size-3.5" aria-hidden />}
        </span>
      );
    }

    return (
      <span
        className={`inline-flex min-w-0 items-center gap-1.5 font-semibold text-xs ${color}`}
      >
        {spinning ? (
          <span className="grid size-4 shrink-0">{spinner}</span>
        ) : (
          <Icon className="size-4 shrink-0" aria-hidden />
        )}
        <span>{label}</span>
      </span>
    );
  },
);
