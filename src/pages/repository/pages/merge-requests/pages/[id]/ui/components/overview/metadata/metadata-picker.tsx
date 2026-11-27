import { Check, Xmark } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { t } from '@/shared/lib/i18n';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import type { MrMetadataEditor } from '../../../../model/metadata/editor';
import { ApprovalRuleFilter } from './approval-rule-filter';
import { CreateLabelForm } from './create-label-form';
import { LabelChip } from './label-chip';
import { ReviewerOption } from './reviewer-option';

export const MetadataPicker = observer(
  ({ model }: { model: MrMetadataEditor }) => {
    const title = useId();
    const labels = model.field === 'labels';
    const candidates = labels
      ? model.labelCandidates
      : model.reviewerCandidates;
    const options = labels ? model.labelsToShow : model.usersToShow;
    const rule = !labels ? model.selectedRule : undefined;
    const self = model.profile.data;
    const showCandidates = !rule;
    return (
      <GlassDialog
        ref={model.attachDialog}
        aria-labelledby={title}
        onClose={model.close}
        className="max-h-[calc(100dvh-2rem)] w-[min(31rem,calc(100%-1.5rem))] max-w-none overflow-hidden p-0 open:flex open:flex-col"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-[var(--glass-border)] border-b p-4">
          <h2 id={title} className="font-semibold">
            {t(
              model.creatingLabel
                ? 'mrMetadata.newLabel'
                : labels
                  ? 'mrMetadata.editLabels'
                  : 'mrMetadata.editReviewers',
            )}
          </h2>
          <button
            type="button"
            className="glass-control grid size-8 shrink-0 place-items-center rounded-lg"
            aria-label={t('common.close')}
            onClick={model.close}
          >
            <Xmark className="size-4" aria-hidden />
          </button>
        </header>
        <div
          className="min-h-0 space-y-3 overflow-y-auto p-4"
          aria-busy={model.busy}
        >
          {model.errorMessage && (
            <p
              role="alert"
              className="whitespace-pre-line text-[var(--color-danger-fg)] text-sm"
            >
              {model.errorMessage}
            </p>
          )}
          {model.rereviewNotice && (
            <p role="status" className="text-fg-muted text-sm">
              {model.rereviewNotice}
            </p>
          )}
          {model.creatingLabel ? (
            <CreateLabelForm model={model} />
          ) : (
            <>
              <input
                type="search"
                className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                aria-label={t(
                  labels ? 'mrMetadata.searchLabels' : 'mrMetadata.searchUsers',
                )}
                placeholder={t(
                  labels ? 'mrMetadata.searchLabels' : 'mrMetadata.searchUsers',
                )}
                value={model.search}
                onChange={(event) => model.setSearch(event.currentTarget.value)}
              />
              {!labels && <ApprovalRuleFilter model={model} />}
              {!labels &&
                self &&
                !model.hasReviewer(self.id) &&
                (!rule ||
                  rule.eligible_approvers?.some(
                    (user) => user.id === self.id,
                  )) && (
                  <button
                    type="button"
                    className="glass-control rounded-lg px-3 py-1.5 text-sm"
                    disabled={model.busy || !model.canUpdate}
                    onClick={() => void model.toggleReviewer(self)}
                  >
                    {t('mrMetadata.assignMe')}
                  </button>
                )}
              {showCandidates && candidates.error && (
                <p
                  role="alert"
                  className="text-[var(--color-danger-fg)] text-sm"
                >
                  {candidates.error instanceof Error
                    ? candidates.error.message
                    : t('mrMetadata.loadError')}
                  <button
                    type="button"
                    className="ml-2 text-fg-link underline"
                    onClick={() => void candidates.refetch()}
                  >
                    {t('common.retry')}
                  </button>
                </p>
              )}
              {showCandidates && candidates.isLoading ? (
                <p role="status" className="text-fg-muted text-sm">
                  {t('common.loading')}
                </p>
              ) : (
                (!showCandidates || !candidates.error) &&
                !options.length && (
                  <p className="text-fg-muted text-sm">
                    {t('mrMetadata.noMatches')}
                  </p>
                )
              )}
              <ul className="grid gap-1">
                {labels
                  ? model.labelsToShow.map((label) => {
                      const selected = model.hasLabel(label.name);
                      return (
                        <li key={label.name}>
                          <button
                            type="button"
                            aria-pressed={selected}
                            disabled={model.busy || !model.canUpdate}
                            className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--glass-hover)] disabled:opacity-60"
                            onClick={() => void model.toggleLabel(label)}
                          >
                            <span className="grid size-4 shrink-0 place-items-center">
                              {selected && (
                                <Check
                                  className="size-4 text-[var(--glass-accent)]"
                                  aria-hidden
                                />
                              )}
                            </span>
                            <span className="grid min-w-0 justify-items-start gap-1">
                              <LabelChip label={label} />
                              {label.description && (
                                <span className="text-fg-muted text-xs [overflow-wrap:anywhere]">
                                  {label.description}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  : model.usersToShow.map((user) => (
                      <ReviewerOption key={user.id} user={user} model={model} />
                    ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {showCandidates && candidates.hasNextPage && (
                  <button
                    type="button"
                    className="glass-control rounded-lg px-3 py-1.5 text-sm"
                    disabled={candidates.isFetchingNextPage}
                    onClick={() => void candidates.fetchNextPage()}
                  >
                    {t('mrMetadata.loadMore')}
                  </button>
                )}
                {labels && model.canCreateLabel && (
                  <button
                    type="button"
                    className="glass-control rounded-lg px-3 py-1.5 text-sm"
                    disabled={model.busy}
                    onClick={model.startLabel}
                  >
                    {t('mrMetadata.newLabel')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </GlassDialog>
    );
  },
);
