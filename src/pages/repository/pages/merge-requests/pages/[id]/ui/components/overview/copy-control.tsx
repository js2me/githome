import { Check, Copy, Link, Xmark } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import { CopyControlVM } from '../../../model/copy-control';
import { actionClass } from './action-classes';

export const CopyControl = withPropsViewModel(CopyControlVM, ({ model }) => {
  const { value, label, branch } = model.payload;
  const copyStatus = model.clipboard.status;
  const actionLabel = branch ? `${label} ${value}` : label;
  const feedback =
    copyStatus === 'copied'
      ? 'Скопировано'
      : copyStatus === 'failed'
        ? 'Не удалось скопировать'
        : '';
  const Icon =
    copyStatus === 'copied'
      ? Check
      : copyStatus === 'failed'
        ? Xmark
        : branch
          ? Copy
          : Link;
  return (
    <button
      type="button"
      className={cn(
        actionClass,
        branch && 'min-w-0 font-mono',
        branch === 'target' && 'max-w-[45%] shrink-0',
      )}
      aria-label={actionLabel}
      title={feedback || actionLabel}
      onClick={model.copy}
    >
      {branch && <span className="truncate">{value}</span>}
      <Icon
        aria-hidden="true"
        width={14}
        height={14}
        className={cn(
          'shrink-0',
          copyStatus === 'copied' && 'text-[var(--color-success-fg)]',
          copyStatus === 'failed' && 'text-[var(--color-danger-fg)]',
        )}
      />
      {!branch && (
        <span className="sr-only @md:not-sr-only">{feedback || 'Ссылка'}</span>
      )}
      <span className="sr-only" role="status">
        {feedback}
      </span>
    </button>
  );
});
