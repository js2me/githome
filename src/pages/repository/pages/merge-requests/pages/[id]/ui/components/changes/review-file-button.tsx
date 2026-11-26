import { Check } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { ReviewFileButtonVM } from '../../../model/changes/reviewed-files/review-file-button';

export const ReviewFileButton = withPropsViewModel(
  ReviewFileButtonVM,
  ({ model }) => {
    const { checked, saving, verifying, disabled, toggle } = model;
    const label = checked
      ? t('review.unmarkAsViewed')
      : t('review.markAsViewed');

    return (
      <button
        type="button"
        className={cn(
          'glass-control inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 font-semibold text-xs disabled:opacity-60',
          checked &&
            'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
        )}
        aria-pressed={checked}
        data-diff-review-toggle=""
        aria-busy={saving || verifying || undefined}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={toggle}
      >
        <Check width={14} height={14} />
        {saving ? t('common.saving') : checked ? t('review.viewed') : null}
      </button>
    );
  },
);
