import { observer } from 'mobx-react-lite';
import { PipelineStatus } from '@/entities/gitlab-pipelines';
import { t } from '@/shared/lib/i18n';
import type { MergeRequestPipelines } from '../../../../model/pipelines/merge-request-pipelines';
import {
  pipelineSelectionKey,
  type SelectedPipeline,
} from '../../../../model/pipelines/select-pipelines';

export const pipelineKindLabel = (kind: SelectedPipeline['kind']) =>
  kind === 'mr'
    ? 'pipelines.mrPipeline'
    : kind === 'branch'
      ? 'pipelines.branchPipeline'
      : 'pipelines.pipeline2';

export const MrPipelineHistory = observer(
  ({ model }: { model: MergeRequestPipelines }) => {
    const selection = model.selected && pipelineSelectionKey(model.selected);
    return (
      <nav
        className="pipeline-manager-history"
        aria-label={t('pipelines.runHistory')}
      >
        <h3>{t('pipelines.runHistory')}</h3>
        <div className="pipeline-manager-history-scroll">
          {model.historyLoading && <p role="status">{t('common.loading')}</p>}
          {model.hasError && (
            <p role="alert">{t('pipelines.couldNotLoadAllPipelines')}</p>
          )}
          <ul>
            {model.history.map((item) => {
              const { pipeline, kind } = item;
              const key = pipelineSelectionKey(item);
              const ref = pipeline.sha?.slice(0, 8);
              return (
                <li key={key}>
                  <button
                    type="button"
                    data-pipeline-id={pipeline.id}
                    aria-current={key === selection ? 'true' : undefined}
                    onClick={() => model.open(item)}
                  >
                    <span className="pipeline-manager-run-line">
                      <span className="font-mono font-semibold">
                        #{pipeline.id}
                      </span>
                      <PipelineStatus status={pipeline.status} />
                    </span>
                    <span className="pipeline-manager-run-line pipeline-manager-run-info">
                      <span>{t(pipelineKindLabel(kind))}</span>
                      {ref && (
                        <span
                          className="truncate font-mono"
                          title={pipeline.sha}
                        >
                          {ref}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {model.hasMore && (
            <button
              type="button"
              className="glass-control rounded-md px-2.5 py-1.5 text-xs"
              disabled={model.refreshing}
              onClick={model.loadMore}
            >
              {t('home.showMore')}
            </button>
          )}
        </div>
      </nav>
    );
  },
);
