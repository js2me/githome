import type { GitLabCommitDC } from '@/shared/api/gitlab';
import { cn } from '@/shared/lib/cn';

const formatCommitDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const CommitRow = ({
  commit,
  isSelected,
  isHead,
  onSelect,
}: {
  commit: GitLabCommitDC;
  isSelected: boolean;
  isHead: boolean;
  onSelect: () => void;
}) => (
  <button
    className={cn(
      'flex w-full flex-col gap-0.5 border-none px-3 py-2 text-left transition',
      isSelected
        ? 'bg-brand-tint hover:bg-brand-selection'
        : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800',
    )}
    type="button"
    role="option"
    aria-selected={isSelected}
    onClick={onSelect}
  >
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          'shrink-0 font-mono text-xs',
          isSelected
            ? 'font-semibold text-brand-ink'
            : 'text-slate-600 dark:text-slate-400',
        )}
      >
        {commit.short_id}
      </span>
      {isHead && (
        <span className="shrink-0 font-normal text-slate-400 text-xs">
          HEAD
        </span>
      )}
      <span
        className={cn(
          'min-w-0 truncate text-sm',
          isSelected
            ? 'font-semibold text-brand-ink'
            : 'text-slate-800 dark:text-slate-200',
        )}
      >
        {commit.title}
      </span>
    </span>
    <span className="truncate text-slate-500 text-xs">
      {commit.author_name} · {formatCommitDate(commit.committed_date)}
    </span>
  </button>
);
