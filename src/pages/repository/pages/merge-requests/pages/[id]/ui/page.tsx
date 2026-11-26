import { withViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { LoadingState } from '@/shared/ui/loading-state';
import { StatusMessage } from '@/shared/ui/status-message';
import { MergeRequestPageVM } from '../model';
import { MergeRequestDetail } from './components/merge-request-detail';

export const MergeRequestPage = withViewModel(
  MergeRequestPageVM,
  ({ model }) => {
    const detailView = model.mrInfo.detailView;
    return (
      <section>
        {model.mrInfo.isLoading && !detailView && (
          <LoadingState>{t('review.loadingMergeRequest')}</LoadingState>
        )}

        {model.mrInfo.showLoadError && (
          <StatusMessage error>{model.mrInfo.errorMessage}</StatusMessage>
        )}

        {detailView && (
          <MergeRequestDetail
            key={`${model.globals.stores.settings.activeId}/${detailView.mergeRequest.id}`}
          />
        )}

        {detailView && model.mrInfo.isRefreshing && (
          <div className="pointer-events-none fixed right-4 bottom-4 z-50 rounded-full border border-slate-200 bg-canvas-overlay p-2 shadow-lg dark:border-slate-700">
            <div
              className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand dark:border-slate-600"
              role="status"
              aria-label={t('review.refreshingMergeRequest')}
            />
          </div>
        )}
      </section>
    );
  },
);
