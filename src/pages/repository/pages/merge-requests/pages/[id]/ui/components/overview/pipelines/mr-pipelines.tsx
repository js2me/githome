import { Timeline } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import { PipelineCard, PipelineRunDialog } from '@/widgets/pipeline-card';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { pipelineSelectionKey } from '../../../../model/pipelines/select-pipelines';
import { MrPipelineHistory, pipelineKindLabel } from './mr-pipeline-history';

export const MrPipelines = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const manager = model.pipelines;
    const { selected, cards, history, hasError, historyLoading } = manager;
    const project = model.parentViewModel.project;
    const sameProject = selected?.projectId === model.markdownScope.projectId;
    return (
      <section className="grid min-w-0 gap-2" aria-labelledby="mr-checks-title">
        <h2
          id="mr-checks-title"
          className="font-semibold text-fg-muted text-sm"
        >
          {t('pipelines.pipelines')}
        </h2>
        {cards.map((item) => (
          <PipelineCard
            key={pipelineSelectionKey(item)}
            id={item.pipeline.id}
            status={item.pipeline.status}
            href={item.pipeline.web_url}
            label={t(pipelineKindLabel(item.kind))}
            onOpen={() => manager.open(item)}
          />
        ))}
        {history.length > 0 && (
          <button
            type="button"
            className="glass-control inline-flex min-h-8 items-center gap-2 justify-self-start rounded-md px-2 text-xs"
            aria-haspopup="dialog"
            onClick={() => manager.open()}
          >
            <Timeline className="size-3.5" aria-hidden />
            {t('pipelines.manageMrPipelines')}
          </button>
        )}
        {hasError ? (
          <StatusMessage error>
            {t('pipelines.couldNotLoadAllPipelines')}
          </StatusMessage>
        ) : (
          history.length === 0 && (
            <p className="text-fg-muted text-xs">
              {t(historyLoading ? 'common.loading' : 'workbench.noChecks')}
            </p>
          )
        )}
        {selected && (
          <PipelineRunDialog
            projectId={selected.projectId}
            projectPath={
              sameProject ? model.markdownScope.projectPath : undefined
            }
            permissions={sameProject ? project?.permissions : undefined}
            lookupProject={!sameProject || project?.permissions == null}
            pipelineId={selected.pipeline.id}
            summary={selected.pipeline}
            labelKey={pipelineKindLabel(selected.kind)}
            heading={t('pipelines.mrPipelineManager', {
              id: model.parentViewModel.mergeRequestIid,
            })}
            history={<MrPipelineHistory model={manager} />}
            historyRefreshing={manager.refreshing}
            onRefreshHistory={manager.refresh}
            onClose={manager.close}
          />
        )}
      </section>
    );
  },
);
