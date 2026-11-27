import { Pencil } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import type { MrMetadataEditor } from '../../../../model/metadata/editor';
import { LabelChip } from './label-chip';
import { MetadataPicker } from './metadata-picker';

const editClass =
  'glass-control inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs';

export const MergeRequestMetadata = observer(
  ({ model }: { model: MrMetadataEditor }) => (
    <div className="grid min-w-0 @md:grid-cols-2 gap-3 border-[var(--glass-border)] border-t @md:px-5 px-3.5 py-3">
      <section className="min-w-0 space-y-1.5">
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">{t('review.reviewers')}</h3>
          {model.canUpdate && (
            <button
              type="button"
              className={editClass}
              aria-haspopup="dialog"
              aria-label={t('mrMetadata.editReviewers')}
              disabled={model.busy}
              onClick={() => model.open('reviewers')}
            >
              <Pencil className="size-3.5" aria-hidden />
              {t('mrMetadata.edit')}
            </button>
          )}
        </div>
        {model.reviewers.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {model.reviewers.map((user) => (
              <li
                key={user.id}
                title={`@${user.username}`}
                className="flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-[var(--glass-control)] px-1.5 py-0.5 text-xs [overflow-wrap:anywhere]"
              >
                <GitlabAvatar
                  className="size-5 shrink-0 rounded-full object-cover"
                  name={user.name}
                  avatarUrl={user.avatar_url}
                />
                {user.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted text-xs">{t('mrMetadata.noReviewers')}</p>
        )}
      </section>
      <section className="min-w-0 space-y-1.5">
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">{t('mrMetadata.labels')}</h3>
          {model.canUpdate && (
            <button
              type="button"
              className={editClass}
              aria-haspopup="dialog"
              aria-label={t('mrMetadata.editLabels')}
              disabled={model.busy}
              onClick={() => model.open('labels')}
            >
              <Pencil className="size-3.5" aria-hidden />
              {t('mrMetadata.edit')}
            </button>
          )}
        </div>
        {model.labels.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {model.labels.map((label) => (
              <li key={label.name} className="min-w-0 max-w-full">
                <LabelChip label={label} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted text-xs">{t('mrMetadata.noLabels')}</p>
        )}
      </section>
      {model.field && <MetadataPicker model={model} />}
    </div>
  ),
);
