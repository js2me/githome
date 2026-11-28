import { observer } from 'mobx-react-lite';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { MergeRequestReactions as ReactionsModel } from '../../../../model/reactions/merge-request-reactions';
import { actionClass } from '../action-classes';

const reactions = [
  { name: 'thumbsup', emoji: '👍', label: 'review.like' },
  { name: 'thumbsdown', emoji: '👎', label: 'review.dislike' },
] as const;

const pulseReaction = (button: HTMLButtonElement, reverse: boolean) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const icon = button.querySelector('[data-mr-reaction-icon]');
  if (!icon) return;
  const id = 'mr-reaction-pop';
  for (const animation of icon.getAnimations()) {
    if (animation.id === id) animation.cancel();
  }
  icon.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(0.84)', offset: 0.2 },
      {
        transform: `scale(1.24) rotate(${reverse ? 12 : -12}deg)`,
        offset: 0.56,
      },
      { transform: 'scale(1) rotate(0)' },
    ],
    { id, duration: 280, easing: 'ease-out' },
  );
};

export const MergeRequestReactions = observer(
  ({ model }: { model: ReactionsModel }) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {reactions.map(({ name, emoji, label }) => {
        const { count, selected } = model.getReaction(name);
        return (
          <button
            key={name}
            type="button"
            className={cn(
              actionClass,
              'cursor-pointer disabled:cursor-default disabled:opacity-60 aria-pressed:border-[var(--glass-accent)] aria-pressed:bg-[var(--glass-selected)]',
            )}
            title={t(label)}
            aria-pressed={selected}
            disabled={!model.canReact}
            onClick={(event) => {
              pulseReaction(event.currentTarget, name === 'thumbsdown');
              void model.toggle(name);
            }}
          >
            <span className="sr-only">{t(label)} </span>
            <span
              aria-hidden="true"
              className="text-base leading-none"
              data-mr-reaction-icon
            >
              {emoji}
            </span>
            <span className="min-w-[1ch] tabular-nums">{count ?? '—'}</span>
          </button>
        );
      })}
      {model.query.error && !model.query.data && (
        <>
          <span role="status" className="text-fg-muted text-xs">
            {t('review.reactionsLoadError')}
          </span>
          <button
            type="button"
            className={actionClass}
            disabled={model.query.isFetching}
            onClick={() => void model.query.refetch()}
          >
            {t('common.retry')}
          </button>
        </>
      )}
      {model.saveFailed && (
        <span role="alert" className="text-[var(--color-danger-fg)] text-xs">
          {t('review.reactionSaveError')}
        </span>
      )}
    </div>
  ),
);
