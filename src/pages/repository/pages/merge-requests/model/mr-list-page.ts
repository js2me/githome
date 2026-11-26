import {
  type GitLabMergeRequestDC,
  type GitLabProjectDC,
  gitlabApi,
} from '@/shared/api/gitlab';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { createGitlabApiQuery } from '@/shared/lib/gitlab/connection/create-query';
import { VM } from '@/shared/lib/view-models/vm';

interface MrListPagePayload {
  project: GitLabProjectDC | null;
  mergeRequests: GitLabMergeRequestDC[];
  selectedMergeRequestIid: number | null;
  onSelect: (mergeRequest: GitLabMergeRequestDC) => void;
}

export class MrListPageVM extends VM<MrListPagePayload> {
  readonly approvals = this.summariesQuery(
    'approvals',
    gitlabApi.getMergeRequestApprovalSummaries,
  );
  readonly discussions = this.summariesQuery(
    'discussions',
    gitlabApi.getMergeRequestDiscussionSummaries,
  );

  private summariesQuery<T>(
    kind: 'approvals' | 'discussions',
    fetchSummaries: (
      connection: GitLabConnection,
      project: GitLabProjectDC,
      iids: number[],
      signal: AbortSignal,
    ) => Promise<Partial<Record<number, T>>>,
  ) {
    return createGitlabApiQuery({
      globals: this.globals,
      abortSignal: this.unmountSignal,
      params: () => {
        const { project, mergeRequests } = this.payload;
        if (!project || !mergeRequests.length) return null;
        return { project, iids: mergeRequests.map((mr) => mr.iid) };
      },
      queryKey: ({ connection, project, iids }) => [
        'merge-request-list',
        kind,
        connection.id,
        connection.gitlabUrl,
        project.id,
        iids,
      ],
      queryFn: ({ connection, project, iids, signal }) =>
        fetchSummaries(connection, project, iids, signal),
      queryOptions: { retry: false },
    });
  }
}
