import { actionBound, observable, runInAction } from 'mobx';
import { type GitLabJobDC, gitlabApi } from '@/shared/api/gitlab';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { t } from '@/shared/lib/i18n';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import {
  type PipelineJobAction,
  pipelineJobAction,
} from './pipeline-job-action';

interface JobRunContext {
  scope: string;
  connection: GitLabConnection;
  projectId: number;
  signal: AbortSignal;
  refresh: () => Promise<unknown>;
}

const operations = {
  play: 'playPipelineJob',
  retry: 'retryPipelineJob',
  cancel: 'cancelPipelineJob',
} as const;

export class PipelineJobRunner {
  private readonly pending = observable.map<string, PipelineJobAction>();
  private readonly errors = observable.map<
    string,
    { job: string; error: Error }
  >();

  get hasPending() {
    return this.pending.size > 0;
  }

  pendingAction(scope: string, id: number) {
    return this.pending.get(`${scope}/${id}`);
  }

  errorMessage(scope: string) {
    return [...this.errors]
      .filter(([key]) => key.startsWith(`${scope}/`))
      .map(([, { job, error }]) =>
        t('pipelines.jobActionError', { name: job, error: error.message }),
      )
      .join('\n');
  }

  @actionBound
  async run(jobs: readonly GitLabJobDC[], context: JobRunContext) {
    const { connection, projectId, scope, signal, refresh } = context;
    const tasks = jobs.flatMap((job) => {
      const action = pipelineJobAction(job.status);
      const key = `${scope}/${job.id}`;
      if (!action || this.pending.has(key)) return [];
      this.pending.set(key, action);
      this.errors.delete(key);
      return [{ job, action, key }];
    });
    if (!tasks.length) return;

    try {
      const results = await Promise.all(
        tasks.map(async ({ job, action, key }) => {
          try {
            await gitlabApi[operations[action]](
              connection,
              projectId,
              job.id,
              signal,
            );
            return true;
          } catch (error) {
            if (!signal.aborted)
              runInAction(() =>
                this.errors.set(key, {
                  job: job.name,
                  error:
                    error instanceof Error
                      ? error
                      : new LocalizedError('common.couldNotCompleteTheAction'),
                }),
              );
            return false;
          }
        }),
      );
      if (!signal.aborted && results.some(Boolean)) await refresh();
    } finally {
      runInAction(() => {
        for (const { key } of tasks) this.pending.delete(key);
      });
    }
  }
}
