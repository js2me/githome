import { observer } from 'mobx-react-lite';
import { PipelineDetailsDialog } from '@/widgets/pipeline-card';
import { getPipelineMergeRequestIid } from '../../model/pipeline-list';
import { DateTime } from './date-time';
import { JobActions } from './job-actions';
import { JobDetails } from './job-details';
import { RunAction } from './run-action';
import {
  control,
  durationLabel,
  errorText,
  type RunProps,
} from './run-presentation';

const sources: Record<string, string> = {
  push: 'Обновление ветки или тега',
  web: 'Интерфейс GitLab',
  api: 'API',
  merge_request_event: 'Мерж-реквест',
  schedule: 'Расписание',
  trigger: 'Триггер',
  pipeline: 'Другой пайплайн',
  parent_pipeline: 'Родительский пайплайн',
  chat: 'Чат',
  external: 'Внешний сервис',
  webide: 'Веб-редактор',
  external_pull_request_event: 'Внешний пул-реквест',
};

export const RunDetails = observer(({ model, run }: RunProps) => {
  const list = model.pipelineList;
  const iid = getPipelineMergeRequestIid(run);
  const mr = list.mergeRequestForPipeline(run);
  const duration = durationLabel(run.duration);
  const author = run.user?.name || run.user?.username;
  return (
    <PipelineDetailsDialog
      pipelineId={run.id}
      pipeline={run}
      jobs={model.jobs.data ?? []}
      loading={model.jobs.isLoading}
      onClose={model.closeDetails}
      error={
        model.jobs.error
          ? errorText(model.jobs.error, 'Не удалось загрузить задания')
          : null
      }
      description={
        <>
          {mr && (
            <p className="mb-2 font-semibold text-fg-default">{mr.title}</p>
          )}
          <dl className="pipeline-details-meta">
            <div>
              <dt>Ветка или тег</dt>
              <dd className="font-mono">{mr?.source_branch || run.ref}</dd>
            </div>
            {run.sha && (
              <div>
                <dt>Коммит</dt>
                <dd className="font-mono" title={run.sha}>
                  {run.sha.slice(0, 8)}
                </dd>
              </div>
            )}
            {run.source && (
              <div>
                <dt>Источник</dt>
                <dd>{sources[run.source] || run.source}</dd>
              </div>
            )}
            {author && (
              <div>
                <dt>Автор</dt>
                <dd>{author}</dd>
              </div>
            )}
            <div>
              <dt>Обновлён</dt>
              <dd>
                <DateTime value={run.updated_at || run.created_at} />
              </dd>
            </div>
            {duration && (
              <div>
                <dt>Длительность</dt>
                <dd>{duration}</dd>
              </div>
            )}
          </dl>
          {list.actionError && (
            <p
              role="alert"
              className="mt-3 text-[var(--color-danger-fg)] text-sm"
            >
              {list.actionError}
            </p>
          )}
        </>
      }
      actions={
        <>
          {iid !== null && (
            <button
              className={control}
              type="button"
              onClick={() => list.openMergeRequest(iid)}
            >
              Открыть MR !{iid}
            </button>
          )}
          <RunAction model={model} run={run} />
        </>
      }
      renderJobActions={(job) => <JobActions model={model} job={job} />}
      renderJobDetails={(job) => <JobDetails model={model} job={job} />}
    />
  );
});
