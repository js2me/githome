import { Eye, EyeSlash } from '@gravity-ui/icons';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

export const AutoReviewToggle = ({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) => {
  const label = t('review.autoMarkAsViewed');
  const Icon = checked ? Eye : EyeSlash;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      className={cn(
        'glass-control ms-auto inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-accent-blue',
        checked
          ? 'bg-[var(--color-brand-tint)] text-accent-blue'
          : 'text-fg-muted',
      )}
      onClick={onToggle}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
};
