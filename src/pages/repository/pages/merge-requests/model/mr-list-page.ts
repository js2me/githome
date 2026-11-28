import type {
  GitLabMergeRequestDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab';
import {
  createMrListApprovalSummariesQuery,
  createMrListDiscussionSummariesQuery,
} from '@/shared/api/gitlab/queries/merge-requests/summaries';
import { VM } from '@/shared/lib/view-models/vm';

interface MrListPagePayload {
  project: GitLabProjectDC | null;
  mergeRequests: GitLabMergeRequestDC[];
  selectedMergeRequestIid: number | null;
  onSelect: (mergeRequest: GitLabMergeRequestDC) => void;
}

export class MrListPageVM extends VM<MrListPagePayload> {
  readonly approvals = createMrListApprovalSummariesQuery(
    this.globals,
    this.unmountSignal,
    () => this.summaryTarget,
  );
  readonly discussions = createMrListDiscussionSummariesQuery(
    this.globals,
    this.unmountSignal,
    () => this.summaryTarget,
  );

  private get summaryTarget() {
    const { project, mergeRequests } = this.payload;
    return project && mergeRequests.length
      ? { project, iids: mergeRequests.map((mr) => mr.iid) }
      : null;
  }
}
