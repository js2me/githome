import { observer } from 'mobx-react-lite';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { GitLabMarkdown } from '@/shared/ui/gitlab-markdown/gitlab-markdown';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';

export const MergeRequestDescription = observer(
  ({
    model,
    description,
  }: {
    model: MergeRequestDetailVM;
    description: string;
  }) => {
    const { descriptionExpanded, markdownScope } = model;
    if (!description.trim()) return null;
    return (
      <section className="flex flex-col gap-3">
        <button
          type="button"
          className="m-0 flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left font-semibold text-lg"
          onClick={model.toggleDescription}
          aria-expanded={descriptionExpanded}
        >
          <svg
            className={cn(
              'h-4 w-4 shrink-0 transition-transform',
              descriptionExpanded && 'rotate-90',
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
          {t('review.description')}
        </button>
        {descriptionExpanded && (
          <div className="glass-panel rounded-2xl p-4">
            <GitLabMarkdown {...markdownScope} text={description} />
          </div>
        )}
      </section>
    );
  },
);
