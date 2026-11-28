import { Files } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { DiffSearchProvider } from '@/shared/ui/git-diff/components/diff-search';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { MrChangesDiff } from '../../changes/mr-changes-diff';

export const MrOverviewChanges = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const detail = model.parentViewModel.mrInfo.detailView;
    if (!detail) return null;

    return (
      <section
        className="mr-overview-changes"
        aria-labelledby="mr-files-heading"
      >
        <div className="mr-overview-changes-head">
          <h2 id="mr-files-heading">
            {detail.isPreparingDiffs
              ? t('review.changes')
              : t('workbench.filesChanged', { count: detail.changes.length })}
          </h2>
          <button
            className="glass-control inline-flex min-h-8 items-center gap-2 rounded-md px-2.5 text-xs"
            type="button"
            onClick={() => model.openEditor()}
          >
            <Files className="size-4 shrink-0" aria-hidden />
            {t('workbench.openChangesEditor')}
          </button>
        </div>
        <DiffSearchProvider findBarVisibility="toggle">
          <MrChangesDiff model={model} />
        </DiffSearchProvider>
      </section>
    );
  },
);
