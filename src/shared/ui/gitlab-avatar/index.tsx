import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import { GitlabAvatarVM } from './model';

export const GitlabAvatar = withPropsViewModel(GitlabAvatarVM, ({ model }) => {
  const { displaySrc, handleImageError } = model;
  const { className, name } = model.payload;

  if (displaySrc) {
    return (
      <img
        className={className}
        src={displaySrc}
        alt=""
        title={name}
        onError={handleImageError}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full bg-[var(--glass-hover)] font-bold text-[11px] text-fg-muted leading-none',
        className,
      )}
      title={name}
    >
      {Array.from(name.trim())[0]?.toUpperCase()}
    </span>
  );
});
