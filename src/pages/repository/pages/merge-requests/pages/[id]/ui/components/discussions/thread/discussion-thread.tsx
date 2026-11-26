import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import { isDiscussionResolvable } from '@/shared/lib/gitlab/discussions/diff-discussions';
import { DiscussionThreadVM } from '../../../../model/merge-request-discussions';
import { DiscussionResolveActions } from '../discussion-resolve-actions';
import { DiscussionNote } from './discussion-note';

export const DiscussionThread = withPropsViewModel(
  DiscussionThreadVM,
  ({ model }) => {
    const {
      discussion,
      onResolveDiscussion,
      resolvingDiscussionId,
      ...noteProps
    } = model.payload;
    const [firstNote, ...replies] = discussion.notes;
    const { resolved, expanded } = model;
    const resolvable = isDiscussionResolvable(discussion);

    if (!firstNote) {
      return null;
    }

    return (
      <section
        className={cn(
          'glass-panel overflow-hidden rounded-xl',
          resolved && 'border-green-200 dark:border-green-900',
        )}
      >
        {resolved && (
          <div className="flex items-center justify-between gap-3 border-green-200 border-b bg-green-50 px-3.5 py-2 font-bold text-green-800 text-xs dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            <span>Тред разрешён</span>
            <button
              className="glass-control rounded-md px-2 py-1 font-semibold text-[11px] text-green-800 dark:text-green-300"
              type="button"
              aria-expanded={expanded}
              onClick={model.toggle}
            >
              {expanded ? 'Скрыть' : 'Показать'}
            </button>
          </div>
        )}

        {expanded && (
          <>
            <DiscussionNote
              key={firstNote.id}
              {...noteProps}
              note={firstNote}
              discussionId={discussion.id}
              isReply={false}
            />

            {replies.length > 0 && (
              <div className="flex flex-col gap-3 pb-3.5">
                {replies.map((note) => (
                  <DiscussionNote
                    key={note.id}
                    {...noteProps}
                    note={note}
                    discussionId={discussion.id}
                    isReply
                  />
                ))}
              </div>
            )}

            <DiscussionResolveActions
              discussionId={discussion.id}
              resolved={resolved}
              resolvable={resolvable}
              isResolving={resolvingDiscussionId === discussion.id}
              onResolve={onResolveDiscussion}
              className="border-slate-200 border-t px-4 py-3 dark:border-slate-800"
            />
          </>
        )}
      </section>
    );
  },
);
