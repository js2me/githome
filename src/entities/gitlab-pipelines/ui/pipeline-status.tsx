import {
  CircleCheckFill,
  CircleDashed,
  CircleMinus,
  CirclePause,
  CirclePlay,
  CircleXmarkFill,
  Clock,
} from '@gravity-ui/icons';

interface StatusAppearance {
  label: string;
  icon: typeof Clock;
  color?: string;
}

const waiting = { icon: Clock, color: 'text-[var(--glass-accent)]' };
const statuses: Record<string, StatusAppearance> = {
  success: {
    label: 'Успешно',
    icon: CircleCheckFill,
    color: 'text-[var(--color-success-fg)]',
  },
  failed: {
    label: 'Ошибка',
    icon: CircleXmarkFill,
    color: 'text-[var(--color-danger-fg)]',
  },
  running: {
    label: 'Выполняется',
    icon: CirclePlay,
    color: 'text-[var(--color-accent-blue)]',
  },
  canceled: { label: 'Отменено', icon: CircleMinus },
  canceling: { label: 'Отменяется', icon: CircleMinus },
  skipped: { label: 'Пропущено', icon: CircleMinus },
  manual: { label: 'Ручной запуск', icon: CirclePause, color: waiting.color },
  blocked: { label: 'Заблокировано', icon: CirclePause, color: waiting.color },
  created: { label: 'Создано', ...waiting },
  scheduled: { label: 'Запланировано', ...waiting },
  preparing: { label: 'Подготовка', ...waiting },
  pending: { label: 'В очереди', ...waiting },
  waiting_for_resource: { label: 'Ожидание ресурса', ...waiting },
  waiting_for_callback: { label: 'Ожидание ответа', ...waiting },
};

export const pipelineStatusLabel = (status: string): string =>
  statuses[status]?.label ?? status.replaceAll('_', ' ');

export const PipelineStatus = ({ status }: { status: string }) => {
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
};
