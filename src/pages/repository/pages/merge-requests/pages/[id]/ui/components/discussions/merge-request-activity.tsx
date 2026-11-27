import { observer } from 'mobx-react-lite';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import type { MergeRequestDetailVM } from '../../../model/merge-request-detail';
import { MergeRequestDiscussions } from './merge-request-discussions';

export const MergeRequestActivity = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const {
      activityDiscussions,
      activityExpanded,
      activityButton,
      markdownScope,
    } = model;
    const info = model.parentViewModel.mrInfo;
    return (
      <section className="flex flex-col gap-3">
        <button
          type="button"
          className="m-0 flex cursor-pointer scroll-mt-16 items-center gap-2 border-none bg-transparent p-0 text-left font-semibold text-lg"
          ref={activityButton}
          onClick={model.toggleActivity}
          aria-expanded={activityExpanded}
        >
          <svg
            className={cn(
              'h-4 w-4 shrink-0 transition-transform',
              activityExpanded && 'rotate-90',
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
          {t('review.activity')}
          {activityDiscussions.length > 0 && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 font-bold text-slate-600 text-xs dark:bg-slate-700 dark:text-slate-300">
              {activityDiscussions.length}
            </span>
          )}
        </button>
        {activityExpanded &&
          (info.mergeRequestDiscussions === null ? (
            <StatusMessage>{t('common.loading')}</StatusMessage>
          ) : (
            <MergeRequestDiscussions
              markdownScope={markdownScope}
              discussions={activityDiscussions}
              onResolveDiscussion={info.resolveDiscussion}
              resolvingDiscussionId={info.resolvingDiscussionId}
              {...model.noteActions}
            />
          ))}
      </section>
    );
  },
);
