import { ArrowsRotateRight, Check } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import type { GitLabUserDC } from '@/shared/api/gitlab';
import { t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import type { MrMetadataEditor } from '../../../../model/metadata/editor';

export const ReviewerOption = observer(
  ({ model, user }: { model: MrMetadataEditor; user: GitLabUserDC }) => {
    const selected = model.hasReviewer(user.id);
    const self = model.profile.data?.id === user.id;
    return (
      <li className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={selected}
          disabled={model.busy || !model.canUpdate}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--glass-hover)] disabled:opacity-60"
          onClick={() => void model.toggleReviewer(user)}
        >
          <span className="grid size-4 shrink-0 place-items-center">
            {selected && (
              <Check
                className="size-4 text-[var(--glass-accent)]"
                aria-hidden
              />
            )}
          </span>
          <GitlabAvatar
            className="size-7 shrink-0 rounded-full object-cover"
            name={user.name}
            avatarUrl={user.avatar_url}
          />
          <span className="min-w-0 text-sm [overflow-wrap:anywhere]">
            <span className="block font-medium">{user.name}</span>
            <span className="block text-fg-muted text-xs">
              @{user.username}
              {self && ` • ${t('mrMetadata.you')}`}
            </span>
          </span>
        </button>
        {selected && model.canUpdate && !self && (
          <button
            type="button"
            className="glass-control grid size-8 shrink-0 place-items-center rounded-lg"
            disabled={model.busy}
            aria-label={t('mrMetadata.requestRereview', { name: user.name })}
            title={t('mrMetadata.requestRereview', { name: user.name })}
            onClick={() => void model.rereview(user)}
          >
            <ArrowsRotateRight className="size-4" aria-hidden />
          </button>
        )}
      </li>
    );
  },
);
