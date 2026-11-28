import { Check } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { OnReviewedChange } from '@/shared/ui/git-diff/model/git-diff-vm';
import type { GithubReviewStateModel } from '../../model/github/review-state';

export const GithubViewedButton = observer(
  ({
    model,
    path,
    onChange,
  }: {
    model: GithubReviewStateModel;
    path: string;
    onChange: OnReviewedChange;
  }) => {
    const checked = model.viewed.has(path);
    const label = t(checked ? 'review.unmarkAsViewed' : 'review.markAsViewed');
    return (
      <button
        type="button"
        className={cn(
          'glass-control inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 font-semibold text-xs disabled:opacity-60',
          checked &&
            'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
        )}
        aria-label={label}
        aria-pressed={checked}
        aria-busy={model.savingFile === path || undefined}
        title={label}
        disabled={model.savingFile !== null}
        onClick={() =>
          void model.markViewed(path, !checked, () => onChange(!checked, true))
        }
      >
        <Check width={14} height={14} />
        {checked ? t('review.viewed') : null}
      </button>
    );
  },
);
